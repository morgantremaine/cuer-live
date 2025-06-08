
import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ShowcallerState } from './useShowcallerState';

interface UseShowcallerPersistenceProps {
  rundownId: string | undefined;
  onShowcallerStateReceived?: (state: ShowcallerState) => void;
}

export const useShowcallerPersistence = ({
  rundownId,
  onShowcallerStateReceived
}: UseShowcallerPersistenceProps) => {
  const lastSaveRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef<boolean>(false);

  // Save showcaller state to database with debouncing
  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
    if (!rundownId) {
      return;
    }

    // Skip if this exact state was already saved
    if (lastSaveRef.current === state.lastUpdate) {
      return;
    }

    // Debounce frequent updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('rundowns')
          .update({
            showcaller_state: state,
            updated_at: new Date().toISOString()
          })
          .eq('id', rundownId);

        if (error) {
          console.error('Error saving showcaller state:', error);
        } else {
          lastSaveRef.current = state.lastUpdate;
        }
      } catch (error) {
        console.error('Error saving showcaller state:', error);
      }
    }, 1000);
  }, [rundownId]);

  // Load showcaller state from database without caching to prevent infinite loops
  const loadShowcallerState = useCallback(async (): Promise<ShowcallerState | null> => {
    if (!rundownId || loadingRef.current) {
      return null;
    }

    loadingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Error loading showcaller state:', error);
        return null;
      }

      if (data?.showcaller_state) {
        return data.showcaller_state as ShowcallerState;
      }

      return null;
    } catch (error) {
      console.error('Error loading showcaller state:', error);
      return null;
    } finally {
      loadingRef.current = false;
    }
  }, [rundownId]);

  return {
    saveShowcallerState,
    loadShowcallerState
  };
};
