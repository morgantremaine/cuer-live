
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// Simplified global cache
let globalTableCheckResult: boolean | null = null;
let globalTableCheckPromise: Promise<boolean> | null = null;

export const useTableChecker = (user: User | null) => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const checkTableExists = useCallback(async () => {
    if (!user) return false;

    // Return cached result if available
    if (globalTableCheckResult !== null) {
      if (tableExists !== globalTableCheckResult) {
        setTableExists(globalTableCheckResult);
      }
      return globalTableCheckResult;
    }

    // If a check is already in progress, wait for it
    if (globalTableCheckPromise) {
      const result = await globalTableCheckPromise;
      setTableExists(result);
      return result;
    }

    // Start new check
    globalTableCheckPromise = (async () => {
      try {
        const { error } = await supabase
          .from('chat_messages')
          .select('id')
          .limit(1);

        const exists = !error || error.code !== '42P01';
        
        // Cache the result globally
        globalTableCheckResult = exists;
        setTableExists(exists);
        
        if (!exists) {
          console.log('Chat messages table does not exist, skipping chat history load');
        }
        
        return exists;
      } catch (error) {
        console.log('Chat messages table not available');
        globalTableCheckResult = false;
        setTableExists(false);
        return false;
      } finally {
        globalTableCheckPromise = null;
      }
    })();

    return await globalTableCheckPromise;
  }, [user, tableExists]);

  return { tableExists, checkTableExists };
};
