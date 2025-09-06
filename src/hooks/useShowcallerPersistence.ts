
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

      // Build backward-compatible payload
      const payload: ShowcallerState & { currentSegment?: string | null; controller?: string | null } = {
        ...state,
        currentSegmentId: (state as any).currentSegmentId ?? (state as any).currentSegment ?? null,
        controllerId: (state as any).controllerId ?? (state as any).controller ?? null,
        // Add legacy keys to avoid older readers defaulting incorrectly
        currentSegment: (state as any).currentSegmentId ?? (state as any).currentSegment ?? null,
        controller: (state as any).controllerId ?? (state as any).controller ?? null
      };

      const { error } = await supabase
        .from('rundowns')
        .update({ 
          showcaller_state: payload,
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
        const raw: any = data.showcaller_state;
        const normalized: ShowcallerState = {
          isPlaying: !!raw.isPlaying,
          currentSegmentId: raw.currentSegmentId ?? raw.currentSegment ?? null,
          timeRemaining: typeof raw.timeRemaining === 'number' ? raw.timeRemaining : 0,
          playbackStartTime: raw.playbackStartTime ?? null,
          lastUpdate: raw.lastUpdate ?? new Date().toISOString(),
          controllerId: raw.controllerId ?? raw.controller ?? null
        };

        console.log('📺 Loaded showcaller state (normalized):', {
          isPlaying: normalized.isPlaying,
          currentSegmentId: normalized.currentSegmentId,
          controllerId: normalized.controllerId
        });
        return normalized;
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
