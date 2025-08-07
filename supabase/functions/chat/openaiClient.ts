import { OpenAIMessage } from './types.ts'

export async function callOpenAI(messages: OpenAIMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Optimized for fast responses
      messages,
      temperature: 0.7,     // Higher temperature for better text processing and creativity
      max_tokens: 2000,     // More tokens for detailed script modifications
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error('Failed to get AI response from OpenAI');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';
}