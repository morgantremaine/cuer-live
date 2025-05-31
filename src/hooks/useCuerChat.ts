import { useState, useCallback } from 'react';
import { browserAIService } from '@/services/browserAIService';

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
    console.log('🔍 Checking browser AI connection...');
    const initialized = await browserAIService.initialize();
    setIsConnected(initialized);
    return initialized;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    console.log('🚀 useCuerChat - Sending message to browser AI:', content);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await browserAIService.sendMessage(content);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. The browser AI model may still be loading.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeRundown = useCallback(async (rundownData: any) => {
    console.log('🔍 useCuerChat - Analyzing rundown with browser AI:', rundownData);
    setIsLoading(true);
    try {
      const analysis = await browserAIService.analyzeRundown(rundownData);
      
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

  const setApiKey = useCallback(() => {
    console.log('API key setting ignored - CORS restrictions prevent direct API calls');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key clearing ignored - CORS restrictions prevent direct API calls');
  }, []);

  const hasApiKey = useCallback(() => {
    return true; // Always true for browser AI
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
