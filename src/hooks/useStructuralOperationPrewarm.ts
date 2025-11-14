import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pre-warm structural-operation-save edge function on rundown load
 * to eliminate cold start delays (8-11 seconds → 500ms-2 seconds)
 * 
 * This hook sends a lightweight pre-warm request to ensure the edge function
 * is already running when the user's first structural operation occurs.
 */
export const useStructuralOperationPrewarm = (
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
      console.log('🔥 Pre-warming structural-operation-save edge function');
      
      try {
        await Promise.race([
          supabase.functions.invoke('structural-operation-save', {
            body: { prewarm: true }
          }),
          new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
        ]);
        
        console.log('✅ Structural-operation-save pre-warmed successfully');
      } catch (err) {
        // Silent failure - this is just a hint to warm the function
        console.log('⚠️ Pre-warm structural-operation-save failed (non-critical):', err);
      }
    }, delayMs);

    return () => clearTimeout(prewarmTimeout);
  }, [rundownId, isInitialized, isConnected, delayMs]);
};
