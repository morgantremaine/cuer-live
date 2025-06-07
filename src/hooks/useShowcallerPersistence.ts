
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
      console.log('📺 Skipping showcaller save - no rundown ID');
      return;
    }

    // Debounce saves to prevent database spam
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
          console.log('📺 Showcaller state saved successfully');
        }
      } catch (error) {
        console.error('Error saving showcaller state:', error);
      }
    }, 500); // 500ms debounce
  }, [rundownId]);

  // Load showcaller state from database
  const loadShowcallerState = useCallback(async (): Promise<ShowcallerState | null> => {
    if (!rundownId) {
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
