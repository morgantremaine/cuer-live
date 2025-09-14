
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseShowcallerInitialStateProps {
  rundownId: string | null;
  onStateLoaded: (state: any) => void;
  trackOwnUpdate: (timestamp: string) => void;
}

export const useShowcallerInitialState = ({
  rundownId,
  onStateLoaded,
  trackOwnUpdate
}: UseShowcallerInitialStateProps) => {
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const loadedRundownRef = useRef<string | null>(null);

  const loadInitialState = useCallback(async () => {
    if (!rundownId || isLoadingRef.current) {
      return;
    }

    // Prevent duplicate loading for the same rundown
    if (loadedRundownRef.current === rundownId && hasLoadedRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('📺 Error loading initial showcaller state:', error);
        // Still mark as loaded even if there's an error
        hasLoadedRef.current = true;
        loadedRundownRef.current = rundownId;
        return;
      }

      if (data?.showcaller_state) {
        // Mark this as our own tracked update to prevent feedback
        if (data.showcaller_state.lastUpdate) {
          trackOwnUpdate(data.showcaller_state.lastUpdate);
        }

        onStateLoaded(data.showcaller_state);
        hasLoadedRef.current = true;
        loadedRundownRef.current = rundownId;
      } else {
        // No showcaller state exists yet, still mark as loaded
        console.log('📺 No existing showcaller state found');
        hasLoadedRef.current = true;
        loadedRundownRef.current = rundownId;
      }
    } catch (error) {
      console.error('📺 Error loading initial state:', error);
      // Still mark as loaded to prevent infinite retries
      hasLoadedRef.current = true;
      loadedRundownRef.current = rundownId;
    } finally {
      isLoadingRef.current = false;
    }
  }, [rundownId, onStateLoaded, trackOwnUpdate]);

  // Reset loading flags when rundownId changes
  useEffect(() => {
    if (rundownId && rundownId !== loadedRundownRef.current) {
      hasLoadedRef.current = false;
      isLoadingRef.current = false;
      loadedRundownRef.current = null;
      // Small delay to ensure other hooks are ready
      const timer = setTimeout(loadInitialState, 100);
      return () => clearTimeout(timer);
    }
  }, [rundownId, loadInitialState]);

  return {
    hasLoaded: hasLoadedRef.current,
    isLoading: isLoadingRef.current
  };
};
