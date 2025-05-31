import { RundownItem } from '@/types/rundown';

// Use environment variable or fallback to empty string
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

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
      const systemPrompt = `You are Cuer, an AI assistant for rundown management. You can suggest modifications to rundown items.

IMPORTANT: When a user asks you to update, add, or modify content in a rundown, you MUST respond with a JSON object that includes a "modifications" array.

Available rundown item fields:
- segmentName: The name/title of the segment
- script: The script content for the segment
- talent: Who is presenting this segment
- notes: Additional notes for the segment
- duration: How long the segment lasts
- startTime: When the segment starts
- endTime: When the segment ends (calculated)

When modifying items, use these reference formats:
- For headers: "A", "B", "C", etc. (like "A2" means the second header)
- For regular items: "1", "2", "3", etc.
- You can also reference by the actual item ID if provided

Always respond with this JSON format when making modifications:
{
  "response": "Your explanation of what you did",
  "modifications": [
    {
      "type": "update|add|delete",
      "itemId": "reference to the item (like A2, 1, 2, etc.)",
      "data": {
        "script": "new script content",
        "segmentName": "new name",
        // ... other fields to update
      },
      "description": "Human-readable description of the change"
    }
  ]
}

Current context: You are helping manage a rundown with items that have row numbers like A, A2, B, 1, 2, 3, etc.`;

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

      // Try to parse JSON from the response
      let modifications: RundownModification[] | undefined;
      
      try {
        // Look for JSON in the response
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          console.log('🤖 openaiService - Found JSON string:', jsonStr);
          const parsed = JSON.parse(jsonStr);
          console.log('🤖 openaiService - Parsed JSON:', parsed);
          
          if (parsed.modifications && Array.isArray(parsed.modifications)) {
            modifications = parsed.modifications;
            console.log('✅ openaiService - Extracted modifications:', modifications);
          }
        }
      } catch (parseError) {
        console.warn('⚠️ openaiService - Failed to parse JSON from response:', parseError);
      }

      const result = {
        response: content,
        modifications
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
