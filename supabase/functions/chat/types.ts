export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}