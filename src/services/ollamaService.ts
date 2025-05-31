
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
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

class OllamaService {
  private baseUrl = 'http://localhost:11434';
  private model = 'llama3.1:8b';

  async sendMessage(messages: OllamaMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: CUER_SYSTEM_PROMPT },
            ...messages
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama service error:', error);
      throw new Error('Failed to communicate with Cuer. Make sure Ollama is running locally.');
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
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
export type { OllamaMessage };
