import { RundownItem } from '@/types/rundown';

// Use your provided API key
const API_KEY = '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';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RundownModification {
  type: 'update' | 'add' | 'delete';
  itemId?: string;
  data?: any;
  description: string;
}

export const openaiService = {
  checkConnection(): Promise<boolean> {
    return Promise.resolve(API_KEY !== '');
  },

  hasApiKey(): boolean {
    return API_KEY !== '';
  },

  async sendMessageWithModifications(messages: OpenAIMessage[]): Promise<{ response: string; modifications?: RundownModification[] }> {
    console.log('🤖 openaiService - sendMessageWithModifications called with messages:', messages);
    
    if (!API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Simplified system prompt for chatbot functionality only
      const systemPrompt = `You are Cuer, an AI assistant for rundown management. You help users with broadcast production questions, rundown analysis, and general assistance.

You are a helpful assistant that can discuss rundown management, timing, content suggestions, and broadcast production workflows. Be conversational and helpful.

Current context: You are helping manage a broadcast rundown.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🤖 openaiService - Raw OpenAI response:', data);
      
      const content = data.choices[0]?.message?.content || '';
      console.log('🤖 openaiService - Response content:', content);

      // Return simple response without modification parsing
      const result = {
        response: content
      };
      
      console.log('🤖 openaiService - Final result:', result);
      return result;
      
    } catch (error) {
      console.error('❌ openaiService - Error in sendMessageWithModifications:', error);
      throw error;
    }
  },

  async analyzeRundown(rundownData: any): Promise<string> {
    if (!API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemPrompt = `You are Cuer, an AI assistant for rundown management. Analyze the provided rundown data and provide insights.
      
Focus on:
1. Total runtime and pacing
2. Distribution of segment types
3. Potential timing issues
4. Content flow and transitions
5. Any obvious gaps or overlaps

Be concise but thorough. Format your analysis with markdown headings and bullet points.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please analyze this rundown data: ${JSON.stringify(rundownData)}` }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No analysis available';
    } catch (error) {
      console.error('Error analyzing rundown:', error);
      throw error;
    }
  }
};
