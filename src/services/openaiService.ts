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

// TODO: Replace with your actual OpenAI API key
const HARDCODED_API_KEY = 'your-api-key-here';

class OpenAIService {
  private apiKey: string = HARDCODED_API_KEY;

  setApiKey(apiKey: string) {
    // Keep this method for backward compatibility, but use hardcoded key
    console.log('API key setting ignored - using hardcoded key');
  }

  getApiKey(): string {
    return this.apiKey;
  }

  clearApiKey() {
    // Do nothing - always use hardcoded key
    console.log('API key clearing ignored - using hardcoded key');
  }

  async sendMessage(messages: OpenAIMessage[]): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'your-api-key-here') {
      throw new Error('Please replace HARDCODED_API_KEY in openaiService.ts with your actual OpenAI API key.');
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
    if (!apiKey || apiKey === 'your-api-key-here') {
      console.log('No valid API key found for connection check');
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
    const hasKey = !!(this.getApiKey() && this.getApiKey() !== 'your-api-key-here');
    console.log('Has valid API key:', hasKey);
    return hasKey;
  }
}

export const openaiService = new OpenAIService();
export type { OpenAIMessage, RundownModification };
