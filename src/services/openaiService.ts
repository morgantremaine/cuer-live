
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

interface RundownModification {
  type: 'add' | 'update' | 'delete' | 'reorder';
  itemId?: string;
  data?: any;
  description: string;
}

const CUER_SYSTEM_PROMPT = `You are Cuer, a professional broadcast production assistant specializing in rundown analysis and optimization. You have extensive knowledge of:

- Broadcast timing and pacing best practices
- Content flow and segment transitions
- Script analysis and improvement suggestions
- Production workflow optimization
- Industry standards for television and radio rundowns

Your personality:
- Professional but approachable
- Concise and actionable in your advice
- Focus on practical solutions
- Use broadcast industry terminology appropriately
- Always provide specific, implementable suggestions

When analyzing rundowns, pay attention to:
- Timing inconsistencies and unrealistic durations
- Missing or poorly structured segments
- Content flow and pacing issues
- Script clarity and presentation quality
- Overall production feasibility

When suggesting rundown modifications, you can respond with JSON objects that describe the changes. Use this format for actionable suggestions:

{
  "response": "Your regular text response",
  "modifications": [
    {
      "type": "add|update|delete",
      "itemId": "item-id-for-updates-or-deletes",
      "data": { rundown item data },
      "description": "Human readable description of the change"
    }
  ]
}

Only suggest modifications when explicitly asked or when critical issues need fixing. Always explain WHY the change is beneficial.

Respond in a helpful, professional manner and always aim to improve the quality and efficiency of broadcast production.`;

class OpenAIService {
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
    console.log('OpenAI API key set:', apiKey.substring(0, 10) + '...');
  }

  getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    
    const stored = localStorage.getItem('openai_api_key');
    if (stored) {
      this.apiKey = stored;
      return stored;
    }
    
    return null;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('openai_api_key');
  }

  async sendMessage(messages: OpenAIMessage[]): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not set. Please configure your API key first.');
    }

    console.log('Sending request to OpenAI with:', {
      model: 'gpt-4o-mini',
      messageCount: messages.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CUER_SYSTEM_PROMPT },
            ...messages
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      console.log('OpenAI response status:', response.status);
      console.log('OpenAI response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key and make sure it has sufficient credits.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please add credits to your OpenAI account.');
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();
      console.log('OpenAI response data:', data);
      
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }
      
      return content;
    } catch (error) {
      console.error('OpenAI service error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to OpenAI. Check your internet connection.');
      }
      throw error;
    }
  }

  async sendMessageWithModifications(messages: OpenAIMessage[]): Promise<{
    response: string;
    modifications?: RundownModification[];
  }> {
    const rawResponse = await this.sendMessage(messages);
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawResponse);
      if (parsed.response && parsed.modifications) {
        console.log('Received modifications from OpenAI:', parsed.modifications);
        return parsed;
      }
    } catch {
      // If not JSON, return as regular response
      console.log('Received regular text response from OpenAI');
    }
    
    return { response: rawResponse };
  }

  async analyzeRundown(rundownData: any): Promise<string> {
    const rundownContext = `
Current Rundown Analysis Request:
Title: ${rundownData.title}
Start Time: ${rundownData.startTime}
Total Items: ${rundownData.items?.length || 0}

Items Summary:
${rundownData.items?.map((item: any, index: number) => 
  `${index + 1}. ${item.type === 'header' ? '[HEADER]' : ''} ${item.name} - Duration: ${item.duration} - Start: ${item.startTime}`
).join('\n') || 'No items found'}

Please analyze this rundown for timing issues, content flow, missing segments, and provide specific improvement suggestions.`;

    return this.sendMessage([
      { role: 'user', content: rundownContext }
    ]);
  }

  async checkConnection(): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('No API key found for connection check');
      return false;
    }

    console.log('Checking OpenAI connection...');
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      console.log('Connection check response:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Connection check failed:', errorText);
        return false;
      }
      
      console.log('OpenAI connection successful');
      return true;
    } catch (error) {
      console.error('Connection check error:', error);
      return false;
    }
  }

  hasApiKey(): boolean {
    const hasKey = !!this.getApiKey();
    console.log('Has API key:', hasKey);
    return hasKey;
  }
}

export const openaiService = new OpenAIService();
export type { OpenAIMessage, RundownModification };
