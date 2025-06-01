
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export const useTableChecker = (user: User | null) => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const checkTableExists = useCallback(async () => {
    if (!user) return false;

    // If we already know the table doesn't exist, don't check again
    if (tableExists === false) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      const exists = !error || error.code !== '42P01';
      setTableExists(exists);
      
      if (!exists) {
        console.log('Chat messages table does not exist, skipping chat history load');
      }
      
      return exists;
    } catch (error) {
      console.log('Chat messages table not available');
      setTableExists(false);
      return false;
    }
  }, [user, tableExists]);

  return { tableExists, checkTableExists };
};
