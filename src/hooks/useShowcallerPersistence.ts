
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
  const loadCacheRef = useRef<{ [key: string]: ShowcallerState }>({});

  // Save showcaller state to database with longer debouncing
  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
    if (!rundownId) {
      console.log('📺 Skipping showcaller save - no rundown ID');
      return;
    }

    // Skip if this exact state was already saved
    if (lastSaveRef.current === state.lastUpdate) {
      return;
    }

    // Longer debounce for frequent timer updates
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
    }, 2000); // Increased debounce to 2 seconds
  }, [rundownId]);

  // Load showcaller state from database with caching
  const loadShowcallerState = useCallback(async (): Promise<ShowcallerState | null> => {
    if (!rundownId) {
      return null;
    }

    // Check cache first
    if (loadCacheRef.current[rundownId]) {
      console.log('📺 Using cached showcaller state');
      return loadCacheRef.current[rundownId];
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
        const state = data.showcaller_state as ShowcallerState;
        console.log('📺 Loaded showcaller state:', state);
        
        // Cache the result for a short time
        loadCacheRef.current[rundownId] = state;
        setTimeout(() => {
          delete loadCacheRef.current[rundownId];
        }, 5000); // Cache for 5 seconds
        
        return state;
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
