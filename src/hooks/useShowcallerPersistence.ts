
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

    console.log('🔍 DEBUG: Showcaller save check', {
      hasState: Object.keys(state).length > 0,
      stateKeys: Object.keys(state),
      isEmpty: Object.keys(state).length === 0
    });

    // CRITICAL FIX: Don't save empty or default showcaller states during initialization
    if (Object.keys(state).length === 0) {
      console.log('🔍 DEBUG: Skipping showcaller save - empty state');
      return true; // Return success without saving
    }

    try {
      console.log('📺 Saving showcaller state:', {
        isPlaying: state.isPlaying,
        currentSegment: state.currentSegmentId,
        controller: state.controllerId,
        rundownId
      });

      console.log('🔍 DEBUG: Showcaller persistence save attempt', {
        hasState: Object.keys(state).length > 0,
        stateContent: JSON.stringify(state),
        willUpdateLastUpdatedBy: JSON.stringify(state) !== '{}' && Object.keys(state).length > 0
      });
      
      // ENHANCED: Always allow saves, remove restrictive blocking
      // CRITICAL FIX: Only update last_updated_by if this is a user-initiated change, not initialization
      const updateData: any = { showcaller_state: state };
      
      // Only update last_updated_by if the state actually changed (not during initialization)
      if (JSON.stringify(state) !== '{}' && Object.keys(state).length > 0) {
        updateData.last_updated_by = (await supabase.auth.getUser()).data.user?.id;
        console.log('🔍 DEBUG: Will update last_updated_by for showcaller');
      } else {
        console.log('🔍 DEBUG: Skipping last_updated_by for showcaller (empty state)');
      }
      
      console.log('🔍 DEBUG: About to update rundowns table with showcaller data');
      const { error } = await supabase
        .from('rundowns')
        .update(updateData)
        .eq('id', rundownId);
      
      console.log('🔍 DEBUG: Showcaller update result', { error });

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
