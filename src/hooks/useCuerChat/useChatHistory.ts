
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { ChatMessage } from './types';

export const useChatHistory = (user: User | null, checkTableExists: () => Promise<boolean>) => {
  const loadChatHistory = useCallback(async (): Promise<ChatMessage[]> => {
    if (!user) return [];

    const exists = await checkTableExists();
    if (!exists) {
      console.log('Chat messages table does not exist, skipping chat history load');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading chat history:', error);
        return [];
      }

      const formattedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        rundown_id: msg.rundown_id
      }));

      return formattedMessages;
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }, [user, checkTableExists]);

  return { loadChatHistory };
};
