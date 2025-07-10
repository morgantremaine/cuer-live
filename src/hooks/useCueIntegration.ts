import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CuePayload {
  event: string;
  timestamp: string;
  rundown: {
    id: string;
    title: string;
    start_time?: string;
  };
  current_segment: {
    id: string;
    slug?: string;
    name?: string;
    row_number?: string;
    duration?: string;
    start_time?: string;
    end_time?: string;
    talent?: string;
    gfx?: string;
    template?: string;
    custom_fields?: Record<string, any>;
  };
  next_segment?: {
    id: string;
    name?: string;
    duration?: string;
  };
  showcaller_state: {
    is_playing: boolean;
    time_remaining?: number;
    playback_start_time?: number;
    controller_id?: string;
  };
}

interface RundownItem {
  id: string;
  name?: string;
  row_number?: string;
  duration?: string;
  start_time?: string;
  end_time?: string;
  talent?: string;
  gfx?: string;
  template?: string;
  music?: string;
  camera?: string;
  notes?: string;
  [key: string]: any;
}

export const useCueIntegration = (
  rundownId: string | null,
  teamId: string | null,
  rundownTitle: string,
  rundownStartTime?: string
) => {
  const { user } = useAuth();
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastCueRef = useRef<string>('');

  const createCuePayload = useCallback((
    event: string,
    currentSegment: RundownItem | null,
    nextSegment: RundownItem | null,
    showcallerState: {
      isPlaying: boolean;
      timeRemaining?: number;
      playbackStartTime?: number;
    }
  ): CuePayload => {
    return {
      event,
      timestamp: new Date().toISOString(),
      rundown: {
        id: rundownId || '',
        title: rundownTitle,
        start_time: rundownStartTime,
      },
      current_segment: {
        id: currentSegment?.id || '',
        slug: currentSegment?.name?.toLowerCase().replace(/\s+/g, '_'),
        name: currentSegment?.name,
        row_number: currentSegment?.row_number,
        duration: currentSegment?.duration,
        start_time: currentSegment?.start_time,
        end_time: currentSegment?.end_time,
        talent: currentSegment?.talent,
        gfx: currentSegment?.gfx,
        template: currentSegment?.template,
        custom_fields: {
          music: currentSegment?.music,
          camera: currentSegment?.camera,
          notes: currentSegment?.notes,
        },
      },
      next_segment: nextSegment ? {
        id: nextSegment.id,
        name: nextSegment.name,
        duration: nextSegment.duration,
      } : undefined,
      showcaller_state: {
        is_playing: showcallerState.isPlaying,
        time_remaining: showcallerState.timeRemaining,
        playback_start_time: showcallerState.playbackStartTime,
        controller_id: user?.id,
      },
    };
  }, [rundownId, rundownTitle, rundownStartTime, user?.id]);

  const sendCueTrigger = useCallback(async (
    event: string,
    currentSegment: RundownItem | null,
    nextSegment: RundownItem | null,
    showcallerState: {
      isPlaying: boolean;
      timeRemaining?: number;
      playbackStartTime?: number;
    }
  ) => {
    if (!rundownId || !teamId) return;

    const payload = createCuePayload(event, currentSegment, nextSegment, showcallerState);
    
    // Create a unique key for this cue to prevent duplicates
    const cueKey = `${event}-${currentSegment?.id}-${showcallerState.isPlaying}`;
    
    // Debounce rapid successive calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      // Skip if this is the exact same cue as last time
      if (lastCueRef.current === cueKey) {
        return;
      }
      
      lastCueRef.current = cueKey;

      try {
        const { error } = await supabase.functions.invoke('send-cue-trigger', {
          body: {
            teamId,
            rundownId,
            payload,
          },
        });

        if (error) {
          console.error('Failed to send cue trigger:', error);
        }
      } catch (error) {
        console.error('Error sending cue trigger:', error);
      }
    }, 200); // 200ms debounce
  }, [rundownId, teamId, createCuePayload]);

  return { sendCueTrigger };
};