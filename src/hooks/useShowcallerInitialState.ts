
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

  const loadInitialState = useCallback(async () => {
    if (!rundownId || hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    console.log('📺 Loading initial showcaller state for rundown:', rundownId);

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('📺 Error loading initial showcaller state:', error);
        return;
      }

      if (data?.showcaller_state) {
        console.log('📺 Found saved showcaller state:', {
          isPlaying: data.showcaller_state.isPlaying,
          currentSegment: data.showcaller_state.currentSegmentId,
          controller: data.showcaller_state.controllerId
        });

        // Mark this as our own tracked update to prevent feedback
        if (data.showcaller_state.lastUpdate) {
          trackOwnUpdate(data.showcaller_state.lastUpdate);
        }

        onStateLoaded(data.showcaller_state);
        hasLoadedRef.current = true;
      } else {
        console.log('📺 No saved showcaller state found');
      }
    } catch (error) {
      console.error('📺 Error loading initial state:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [rundownId, onStateLoaded, trackOwnUpdate]);

  // Reset loading flag when rundownId changes
  useEffect(() => {
    if (rundownId) {
      hasLoadedRef.current = false;
      isLoadingRef.current = false;
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
