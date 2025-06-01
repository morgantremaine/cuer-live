import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Define the types locally since we're not using the openaiService anymore
interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
    try {
      // Test if we can reach the edge function
      const { error } = await supabase.functions.invoke('chat', {
        body: { message: 'test', rundownData: null }
      });
      
      const connected = !error || !error.message.includes('not found');
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  const sendMessage = useCallback(async (content: string, rundownData?: any) => {
    console.log('🚀 useCuerChat - Sending message:', content);
    console.log('🚀 useCuerChat - With rundown data:', rundownData);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: content,
          rundownData: rundownData || null
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your OpenAI API key is configured in Supabase secrets.`,
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
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: `Can you review the current rundown and suggest any improvements to spelling, grammar, timing, or structure in plain English?`,
          rundownData
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze rundown');
      }

      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message || 'Analysis completed.',
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
  }, []);

  const setApiKey = useCallback((apiKey: string) => {
    console.log('API key should be set in Supabase secrets, not client-side');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key should be managed in Supabase secrets');
  }, []);

  const hasApiKey = useCallback(() => {
    return isConnected === true; // If connected, assume API key is configured
  }, [isConnected]);

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    analyzeRundown,
    clearChat,
    checkConnection,
    setApiKey,
    clearApiKey,
    hasApiKey
  };
};
