
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from './useCuerChat/types';
import { useTableChecker } from './useCuerChat/useTableChecker';
import { useChatHistory } from './useCuerChat/useChatHistory';
import { useMessageDatabase } from './useCuerChat/useMessageDatabase';
import { useConnectionChecker } from './useCuerChat/useConnectionChecker';
import { useChatOperations } from './useCuerChat/useChatOperations';

export const useCuerChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { tableExists, checkTableExists } = useTableChecker(user);
  const { loadChatHistory } = useChatHistory(user, checkTableExists);
  const { saveMessageToDb, clearChatFromDb } = useMessageDatabase(user, tableExists);
  const { isConnected, checkConnection } = useConnectionChecker();
  const { sendMessage, analyzeRundown } = useChatOperations(setMessages, setIsLoading, saveMessageToDb);

  useEffect(() => {
    if (user) {
      loadChatHistory().then(setMessages);
    } else {
      setMessages([]);
    }
  }, [user, loadChatHistory]);

  const clearChat = useCallback(async () => {
    if (!user || !tableExists) {
      setMessages([]);
      return;
    }

    try {
      await clearChatFromDb();
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      setMessages([]);
    }
  }, [user, tableExists, clearChatFromDb]);

  const setApiKey = useCallback((apiKey: string) => {
    console.log('API key should be set in Supabase secrets, not client-side');
    checkConnection();
  }, [checkConnection]);

  const clearApiKey = useCallback(() => {
    console.log('API key should be managed in Supabase secrets');
  }, []);

  const hasApiKey = useCallback(() => {
    return isConnected === true;
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
    loadChatHistory: () => loadChatHistory().then(setMessages)
  };
};
