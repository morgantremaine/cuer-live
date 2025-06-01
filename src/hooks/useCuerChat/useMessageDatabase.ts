
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { ChatMessage } from './types';

export const useMessageDatabase = (user: User | null, tableExists: boolean | null) => {
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

  const clearChatFromDb = useCallback(async () => {
    if (!user || !tableExists) return;

    try {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }, [user, tableExists]);

  return { saveMessageToDb, clearChatFromDb };
};
