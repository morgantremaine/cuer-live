
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

  // Save showcaller state to database with debouncing
  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
    if (!rundownId) {
      console.log('📺 No rundownId for saving showcaller state');
      return;
    }

    // Skip if this exact state was already saved
    if (lastSaveRef.current === state.lastUpdate) {
      console.log('📺 Skipping save - same lastUpdate');
      return;
    }

    // Debounce frequent updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        console.log('📺 Saving showcaller state:', state);
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
          console.log('📺 Successfully saved showcaller state');
        }
      } catch (error) {
        console.error('Error saving showcaller state:', error);
      }
    }, 1000);
  }, [rundownId]);

  // Load showcaller state from database
  const loadShowcallerState = useCallback(async (): Promise<ShowcallerState | null> => {
    if (!rundownId) {
      console.log('📺 No rundownId for loading showcaller state');
      return null;
    }

    try {
      console.log('📺 Loading showcaller state for rundown:', rundownId);
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
        console.log('📺 Loaded showcaller state:', data.showcaller_state);
        return data.showcaller_state as ShowcallerState;
      }

      console.log('📺 No showcaller state found in database');
      return null;
    } catch (error) {
      console.error('Error loading showcaller state:', error);
      return null;
    }
  }, [rundownId]);

  return {
    saveShowcallerState,
    loadShowcallerState
  };
};
