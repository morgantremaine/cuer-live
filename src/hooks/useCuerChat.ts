
import { useState, useCallback } from 'react';
import { openaiService, OpenAIMessage, RundownModification } from '@/services/openaiService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modifications?: RundownModification[];
}

export const useCuerChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [pendingModifications, setPendingModifications] = useState<RundownModification[] | null>(null);

  const checkConnection = useCallback(async () => {
    const connected = await openaiService.checkConnection();
    setIsConnected(connected);
    return connected;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    console.log('🚀 useCuerChat - Sending message:', content);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Since direct API calls are blocked, show a helpful message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, but the AI chat feature is currently unavailable due to browser security restrictions (CORS policy). 

To enable AI features, you would need to:
1. **Recommended**: Create a Supabase Edge Function to proxy OpenAI API calls
2. Or implement a backend service to handle API requests

This ensures secure handling of API keys and avoids browser CORS restrictions.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
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
  }, []);

  const analyzeRundown = useCallback(async (rundownData: any) => {
    console.log('🔍 useCuerChat - Analyzing rundown:', rundownData);
    setIsLoading(true);
    try {
      // Use the mock analysis instead of the real API
      const analysis = await openaiService.mockAnalyzeRundown(rundownData);
      
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('❌ useCuerChat - Error analyzing rundown:', error);
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
    setPendingModifications(null);
  }, []);

  // These methods are kept for backward compatibility but do nothing
  const setApiKey = useCallback((apiKey: string) => {
    console.log('API key setting ignored - CORS restrictions prevent direct API calls');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key clearing ignored - CORS restrictions prevent direct API calls');
  }, []);

  const hasApiKey = useCallback(() => {
    return false; // Always false due to CORS restrictions
  }, []);

  const clearPendingModifications = useCallback(() => {
    console.log('🧹 useCuerChat - Clearing pending modifications');
    setPendingModifications(null);
  }, []);

  return {
    messages,
    isLoading,
    isConnected,
    pendingModifications,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection,
    setApiKey,
    clearApiKey,
    hasApiKey,
    clearPendingModifications
  };
};
