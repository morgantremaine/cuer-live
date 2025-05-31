
import { useState, useCallback } from 'react';
import { ollamaService, OllamaMessage } from '@/services/ollamaService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useCuerChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const checkConnection = useCallback(async () => {
    const connected = await ollamaService.checkConnection();
    setIsConnected(connected);
    return connected;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const ollamaMessages: OllamaMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      ollamaMessages.push({ role: 'user', content });

      const response = await ollamaService.sendMessage(ollamaMessages);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const analyzeRundown = useCallback(async (rundownData: any) => {
    setIsLoading(true);
    try {
      const analysis = await ollamaService.analyzeRundown(rundownData);
      
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📊 **Rundown Analysis Complete**\n\n${analysis}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I couldn't analyze the rundown: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection
  };
};
