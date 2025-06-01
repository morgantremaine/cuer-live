
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
  const [isConnected, setIsConnected] = useState<boolean | null>(false); // Set to false since no backend
  const [pendingModifications, setPendingModifications] = useState<RundownModification[] | null>(null);

  const checkConnection = useCallback(async () => {
    // No backend available, return false
    setIsConnected(false);
    return false;
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
      // Since there's no backend configured, provide a helpful response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your message: "${content}"\n\nHowever, I'm currently not connected to any backend AI service. To use Cuer AI features, you'll need to:\n\n1. Set up a Supabase project with edge functions\n2. Configure an OpenAI API key\n3. Deploy the chat function to handle AI requests\n\nFor now, I can only echo your messages and provide basic information about the rundown interface.`,
        timestamp: new Date(),
        modifications: []
      };

      setMessages(prev => [...prev, assistantMessage]);

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
      // Provide basic analysis without backend
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📊 **Rundown Analysis**\n\nI can see your rundown "${rundownData?.title || 'Untitled'}" has ${rundownData?.items?.length || 0} items.\n\nTo get AI-powered analysis and suggestions, you'll need to configure the backend AI service. For now, I can tell you:\n\n• Total items: ${rundownData?.items?.length || 0}\n• Timezone: ${rundownData?.timezone || 'Not set'}\n• Start time: ${rundownData?.startTime || 'Not set'}`,
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
    console.log('API key setting not available - backend not configured');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key clearing not needed - no backend configured');
  }, []);

  const hasApiKey = useCallback(() => {
    return false; // No backend configured
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
