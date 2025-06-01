
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useConnectionChecker = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const checkConnection = useCallback(async () => {
    try {
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

  return { isConnected, checkConnection };
};
