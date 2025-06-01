
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export const useTableChecker = (user: User | null) => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);

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

  return { tableExists, checkTableExists };
};
