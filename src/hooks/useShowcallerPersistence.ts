
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShowcallerState } from './useShowcallerState';

interface UseShowcallerPersistenceProps {
  rundownId: string | null;
  trackOwnUpdate?: (timestamp: string) => void;
}

export const useShowcallerPersistence = ({ 
  rundownId, 
  trackOwnUpdate 
}: UseShowcallerPersistenceProps) => {

  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
    if (!rundownId) {
      console.warn('📺 Cannot save showcaller state: no rundown ID');
      return false;
    }

    try {
      console.log('📺 Saving showcaller state:', {
        isPlaying: state.isPlaying,
        currentSegment: state.currentSegmentId,
        controller: state.controllerId,
        rundownId
      });

      // ENHANCED: Always allow saves, remove restrictive blocking
      const { error } = await supabase
        .from('rundowns')
        .update({ 
          showcaller_state: state,
          last_updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', rundownId);

      if (error) {
        console.error('📺 Failed to save showcaller state:', error);
        return false;
      }

      // Track this as our own update
      if (trackOwnUpdate && state.lastUpdate) {
        trackOwnUpdate(state.lastUpdate);
      }

      console.log('📺 Successfully saved showcaller state');
      return true;
    } catch (error) {
      console.error('📺 Error saving showcaller state:', error);
      return false;
    }
  }, [rundownId, trackOwnUpdate]);

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
        .maybeSingle();

      if (error) {
        console.error('📺 Error loading showcaller state:', error);
        return null;
      }

      if (data?.showcaller_state) {
        console.log('📺 Loaded showcaller state:', {
          isPlaying: data.showcaller_state.isPlaying,
          currentSegment: data.showcaller_state.currentSegmentId,
          controller: data.showcaller_state.controllerId
        });
        return data.showcaller_state as ShowcallerState;
      }

      return null;
    } catch (error) {
      console.error('📺 Error loading showcaller state:', error);
      return null;
    }
  }, [rundownId]);

  return {
    saveShowcallerState,
    loadShowcallerState
  };
};
