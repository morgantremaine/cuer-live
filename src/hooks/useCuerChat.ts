
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  rundown_id?: string;
}

export const useCuerChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const { user } = useAuth();

  // Check if chat_messages table exists
  const checkTableExists = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      const exists = !error || error.code !== '42P01';
      setTableExists(exists);
      return exists;
    } catch (error) {
      console.log('Chat messages table not available');
      setTableExists(false);
      return false;
    }
  }, [user]);

  // Load chat history when user logs in
  const loadChatHistory = useCallback(async () => {
    if (!user) return;

    // Check if table exists first
    const exists = await checkTableExists();
    if (!exists) {
      console.log('Chat messages table does not exist, skipping chat history load');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100); // Limit to last 100 messages

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      const formattedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        rundown_id: msg.rundown_id
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, [user, checkTableExists]);

  // Save message to database
  const saveMessageToDb = useCallback(async (message: ChatMessage) => {
    if (!user || !tableExists) return;

    try {
      await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          role: message.role,
          content: message.content,
          rundown_id: message.rundown_id || null
        });
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  }, [user, tableExists]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      setMessages([]);
    }
  }, [user, loadChatHistory]);

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

  const sendMessage = useCallback(async (content: string, rundownData?: any, rundownId?: string) => {
    console.log('🚀 useCuerChat - Sending message:', content);
    console.log('🚀 useCuerChat - With rundown data:', rundownData);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      rundown_id: rundownId
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessageToDb(userMessage);
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
        timestamp: new Date(),
        rundown_id: rundownId
      };

      setMessages(prev => [...prev, assistantMessage]);
      saveMessageToDb(assistantMessage);

    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your OpenAI API key is configured in Supabase secrets.`,
        timestamp: new Date(),
        rundown_id: rundownId
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToDb(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [saveMessageToDb]);

  const analyzeRundown = useCallback(async (rundownData: any, rundownId?: string) => {
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
        timestamp: new Date(),
        rundown_id: rundownId
      };

      setMessages(prev => [...prev, analysisMessage]);
      saveMessageToDb(analysisMessage);

    } catch (error) {
      console.error('❌ useCuerChat - Error analyzing rundown:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I couldn't analyze the rundown: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        rundown_id: rundownId
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToDb(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [saveMessageToDb]);

  const clearChat = useCallback(async () => {
    if (!user || !tableExists) {
      setMessages([]);
      return;
    }

    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
      
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Still clear local messages even if DB clear fails
      setMessages([]);
    }
  }, [user, tableExists]);

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
    hasApiKey,
    loadChatHistory
  };
};
