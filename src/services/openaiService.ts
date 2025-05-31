
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

Respond in a helpful, professional manner and always aim to improve the quality and efficiency of broadcast production.`;

class OpenAIService {
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
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

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key.');
        }
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response received';
    } catch (error) {
      console.error('OpenAI service error:', error);
      throw error;
    }
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
    if (!apiKey) return false;

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  hasApiKey(): boolean {
    return !!this.getApiKey();
  }
}

export const openaiService = new OpenAIService();
export type { OpenAIMessage };
