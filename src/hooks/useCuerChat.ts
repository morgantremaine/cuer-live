import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Define the types locally since we're not using the openaiService anymore
interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
  description: string; // Added required description property
}

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
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: content,
          rundownData: null // This could be passed from the parent component
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        modifications: data.modifications || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set pending modifications if any
      if (data.modifications && data.modifications.length > 0) {
        setPendingModifications(data.modifications);
      }

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
          message: `Please analyze this rundown and provide suggestions for improvement, timing optimization, and any issues you notice.`,
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
        timestamp: new Date(),
        modifications: data.modifications || []
      };

      setMessages(prev => [...prev, analysisMessage]);

      if (data.modifications && data.modifications.length > 0) {
        setPendingModifications(data.modifications);
      }
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
