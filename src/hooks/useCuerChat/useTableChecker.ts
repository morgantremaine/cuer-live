
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// Global cache to prevent multiple checks
let globalTableCheckCache: { [userId: string]: boolean | null } = {};

export const useTableChecker = (user: User | null) => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const checkTableExists = useCallback(async () => {
    if (!user) return false;

    const userId = user.id;
    
    // Check global cache first
    if (globalTableCheckCache[userId] !== undefined) {
      const cachedResult = globalTableCheckCache[userId];
      if (tableExists !== cachedResult) {
        setTableExists(cachedResult);
      }
      return cachedResult || false;
    }

    // If we already know locally that the table doesn't exist, don't check again
    if (tableExists === false) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      const exists = !error || error.code !== '42P01';
      
      // Cache the result globally and locally
      globalTableCheckCache[userId] = exists;
      setTableExists(exists);
      
      if (!exists) {
        console.log('Chat messages table does not exist, skipping chat history load');
      }
      
      return exists;
    } catch (error) {
      console.log('Chat messages table not available');
      globalTableCheckCache[userId] = false;
      setTableExists(false);
      return false;
    }
  }, [user, tableExists]);

  return { tableExists, checkTableExists };
};
