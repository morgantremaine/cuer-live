import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pre-warm edge functions on rundown load to eliminate cold start delays
 * 
 * Pings structural-operation-save and cell-field-save functions with lightweight
 * requests to ensure they're "warm" (running instance already spun up) before
 * the user's first save operation.
 * 
 * Typical cold start: 8-11 seconds
 * After pre-warming: 500ms-2 seconds
 */
export const useEdgeFunctionPrewarming = (
  rundownId: string | null,
  isInitialized: boolean,
  isConnected: boolean = false,
  delayMs: number = 2000
) => {
  const hasPrewarmedRef = useRef(false);

  useEffect(() => {
    // Only pre-warm once per rundown session
    if (!rundownId || !isInitialized || !isConnected || hasPrewarmedRef.current) {
      return;
    }

    hasPrewarmedRef.current = true;

    // Delay pre-warming to let UI fully render first
    const prewarmTimeout = setTimeout(async () => {
      console.log('🔥 Pre-warming edge functions (delayed for UI smoothness)...');

      const prewarmPromises = [
        // Ping structural-operation-save
        supabase.functions.invoke('structural-operation-save', {
          body: { prewarm: true }
        }).catch(err => {
          // Silent failure - this is just a hint to warm the function
          console.log('Pre-warm structural-operation-save:', err.message);
        }),

        // Ping cell-field-save
        supabase.functions.invoke('cell-field-save', {
          body: { prewarm: true }
        }).catch(err => {
          // Silent failure - this is just a hint to warm the function
          console.log('Pre-warm cell-field-save:', err.message);
        })
      ];

      // Run pre-warming in parallel with 5-second timeout per function
      await Promise.race([
        Promise.all(prewarmPromises),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);

      console.log('✅ Edge functions pre-warmed');
    }, delayMs);

    return () => clearTimeout(prewarmTimeout);
  }, [rundownId, isInitialized, isConnected, delayMs]);
};
