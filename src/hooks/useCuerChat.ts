
import { useState, useCallback } from 'react';

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
  const [isConnected, setIsConnected] = useState<boolean | null>(true); // Always connected for Supabase
  const [pendingModifications, setPendingModifications] = useState<RundownModification[] | null>(null);

  const checkConnection = useCallback(async () => {
    // Always return true since we're using Supabase Edge Functions
    setIsConnected(true);
    return true;
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
      // Fix the API endpoint to use the correct Supabase edge function URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/openai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })).concat([{ role: 'user', content }])
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('📥 useCuerChat - Received result:', result);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'I received your message but couldn\'t generate a response.',
        timestamp: new Date(),
        modifications: result.modifications || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If there are modifications, show them for confirmation
      if (result.modifications && result.modifications.length > 0) {
        console.log('✅ useCuerChat - Setting pending modifications:', result.modifications);
        setPendingModifications(result.modifications);
      }
    } catch (error) {
      console.error('❌ useCuerChat - Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if your Supabase edge function is properly configured.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const analyzeRundown = useCallback(async (rundownData: any) => {
    console.log('🔍 useCuerChat - Analyzing rundown:', rundownData);
    setIsLoading(true);
    try {
      // You can implement rundown analysis via the same edge function
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📊 **Rundown Analysis Complete**\n\nI can see your rundown has ${rundownData?.items?.length || 0} items. How can I help you optimize it?`,
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

  // Updated to accept apiKey parameter
  const setApiKey = useCallback((apiKey: string) => {
    console.log('API key setting not needed - using Supabase Edge Function');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key clearing not needed - using Supabase Edge Function');
  }, []);

  const hasApiKey = useCallback(() => {
    return true; // Always true since we're using Supabase
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
