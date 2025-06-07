
import { useState, useRef, useEffect, useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  lastPlayStartTime?: number;
}

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void,
  onShowcallerStateChange?: (state: ShowcallerState) => void,
  externalShowcallerState?: ShowcallerState | null,
  rundownId?: string | null
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastPlayStartTimeRef = useRef<number | undefined>(undefined);
  const isProcessingExternalUpdateRef = useRef(false);

  // Sync with external state when it changes (from real-time updates)
  useEffect(() => {
    if (externalShowcallerState && !isProcessingExternalUpdateRef.current) {
      const hasSignificantStateChanged = (
        externalShowcallerState.currentSegmentId !== currentSegmentId ||
        Math.abs(externalShowcallerState.isPlaying !== isPlaying ? 1 : 0) === 1 ||
        Math.abs(externalShowcallerState.timeRemaining - timeRemaining) > 3
      );

      if (hasSignificantStateChanged) {
        console.log('📡 Syncing showcaller state from remote:', externalShowcallerState);
        
        isProcessingExternalUpdateRef.current = true;
        
        setCurrentSegmentId(externalShowcallerState.currentSegmentId);
        
        // Calculate adjusted time remaining based on when the external play started
        if (externalShowcallerState.isPlaying && externalShowcallerState.lastPlayStartTime) {
          const timeSinceStart = Math.floor((Date.now() - externalShowcallerState.lastPlayStartTime) / 1000);
          const adjustedTimeRemaining = Math.max(0, externalShowcallerState.timeRemaining - timeSinceStart);
          setTimeRemaining(adjustedTimeRemaining);
          lastPlayStartTimeRef.current = externalShowcallerState.lastPlayStartTime;
        } else {
          setTimeRemaining(externalShowcallerState.timeRemaining);
          lastPlayStartTimeRef.current = undefined;
        }

        // Only update isPlaying if it's actually different
        if (externalShowcallerState.isPlaying !== isPlaying) {
          setIsPlaying(externalShowcallerState.isPlaying);
        }

        // Allow state changes again after a brief delay
        setTimeout(() => {
          isProcessingExternalUpdateRef.current = false;
        }, 200);
      }
    }
  }, [externalShowcallerState, currentSegmentId, isPlaying, timeRemaining]);

  // Broadcast state changes to other clients - ONLY if we have a saved rundownId
  const broadcastState = useCallback((newState: Partial<ShowcallerState>) => {
    // CRITICAL: Don't broadcast if we don't have a rundownId (new unsaved rundown)
    if (!rundownId || isProcessingExternalUpdateRef.current) {
      console.log('⏭️ Skipping showcaller broadcast - no rundownId or processing external update', { rundownId });
      return;
    }

    const fullState: ShowcallerState = {
      isPlaying: newState.isPlaying ?? isPlaying,
      currentSegmentId: newState.currentSegmentId ?? currentSegmentId,
      timeRemaining: newState.timeRemaining ?? timeRemaining,
      lastPlayStartTime: newState.isPlaying ? (lastPlayStartTimeRef.current || Date.now()) : undefined
    };
    
    // Only broadcast if this is our own change (prevent infinite loops)
    const now = Date.now();
    if (now - lastSyncTimeRef.current > 500) { // Debounce broadcasts
      console.log('📡 Broadcasting showcaller state change:', fullState);
      onShowcallerStateChange?.(fullState);
      lastSyncTimeRef.current = now;
    }
  }, [isPlaying, currentSegmentId, timeRemaining, onShowcallerStateChange, rundownId]);

  // Set default current segment to first non-header item (A1) on mount
  useEffect(() => {
    if (!currentSegmentId && items.length > 0 && !externalShowcallerState && rundownId) {
      const firstSegment = items.find(item => !isHeaderItem(item));
      if (firstSegment) {
        setCurrentSegmentId(firstSegment.id);
        const duration = timeToSeconds(firstSegment.duration);
        setTimeRemaining(duration);
        broadcastState({
          currentSegmentId: firstSegment.id,
          timeRemaining: duration,
          isPlaying: false
        });
      }
    }
  }, [items, currentSegmentId, externalShowcallerState, broadcastState, rundownId]);

  const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      // MM:SS format (minutes:seconds)
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  const clearCurrentStatus = () => {
    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'completed');
      }
    });
  };

  const setCurrentSegment = (segmentId: string) => {
    if (isProcessingExternalUpdateRef.current) return;

    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    if (segment && !isHeaderItem(segment)) {
      updateItem(segmentId, 'status', 'current');
      setCurrentSegmentId(segmentId);
      const duration = timeToSeconds(segment.duration);
      setTimeRemaining(duration);
      broadcastState({
        currentSegmentId: segmentId,
        timeRemaining: duration
      });
    }
  };

  const getNextSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (!isHeaderItem(items[i])) {
        return items[i];
      }
    }
    return null;
  };

  const getPreviousSegment = (currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!isHeaderItem(items[i])) {
        return items[i];
      }
    }
    return null;
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Store when playback started for external sync
    lastPlayStartTimeRef.current = Date.now();

    console.log('🎬 Starting timer for segment:', currentSegmentId, 'with time:', timeRemaining);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        console.log('⏱️ Timer tick:', newTime);
        
        if (newTime <= 0) {
          // Time's up, mark current as completed and move to next segment
          if (currentSegmentId) {
            updateItem(currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(currentSegmentId);
            if (nextSegment) {
              setCurrentSegment(nextSegment.id);
              return timeToSeconds(nextSegment.duration);
            } else {
              // No more segments, stop playback
              setIsPlaying(false);
              setCurrentSegmentId(null);
              lastPlayStartTimeRef.current = undefined;
              broadcastState({
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0
              });
              return 0;
            }
          }
          return 0;
        }
        
        // Broadcast updated time occasionally (only if we have a saved rundownId)
        if (newTime % 10 === 0 && rundownId) { // Every 10 seconds
          broadcastState({
            timeRemaining: newTime,
            isPlaying: true
          });
        }
        
        return newTime;
      });
    }, 1000);
  }, [currentSegmentId, timeRemaining, updateItem, broadcastState, rundownId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    lastPlayStartTimeRef.current = undefined;
    console.log('⏹️ Timer stopped');
  }, []);

  const play = useCallback((selectedSegmentId?: string) => {
    if (isProcessingExternalUpdateRef.current) return;

    console.log('▶️ Play called with segment:', selectedSegmentId);

    if (selectedSegmentId) {
      // Mark all segments before the selected one as upcoming
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (!isHeaderItem(item)) {
          if (index < selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          } else if (index > selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          }
        }
      });
      setCurrentSegment(selectedSegmentId);
    }
    
    setIsPlaying(true);
    lastPlayStartTimeRef.current = Date.now();
    broadcastState({ 
      isPlaying: true, 
      lastPlayStartTime: lastPlayStartTimeRef.current 
    });
  }, [items, setCurrentSegment, broadcastState]);

  const pause = useCallback(() => {
    if (isProcessingExternalUpdateRef.current) return;

    console.log('⏸️ Pause called');
    setIsPlaying(false);
    lastPlayStartTimeRef.current = undefined;
    broadcastState({ isPlaying: false });
    stopTimer();
  }, [broadcastState, stopTimer]);

  const forward = useCallback(() => {
    if (isProcessingExternalUpdateRef.current) return;

    if (currentSegmentId) {
      const nextSegment = getNextSegment(currentSegmentId);
      if (nextSegment) {
        updateItem(currentSegmentId, 'status', 'completed');
        setCurrentSegment(nextSegment.id);
        if (isPlaying) {
          lastPlayStartTimeRef.current = Date.now();
          startTimer();
        }
      }
    }
  }, [currentSegmentId, isPlaying, updateItem, setCurrentSegment, startTimer]);

  const backward = useCallback(() => {
    if (isProcessingExternalUpdateRef.current) return;

    if (currentSegmentId) {
      const prevSegment = getPreviousSegment(currentSegmentId);
      if (prevSegment) {
        updateItem(currentSegmentId, 'status', 'upcoming');
        setCurrentSegment(prevSegment.id);
        if (isPlaying) {
          lastPlayStartTimeRef.current = Date.now();
          startTimer();
        }
      }
    }
  }, [currentSegmentId, isPlaying, updateItem, setCurrentSegment, startTimer]);

  // Auto-start timer when playing state changes to true
  useEffect(() => {
    if (isPlaying && currentSegmentId && !timerRef.current && !isProcessingExternalUpdateRef.current) {
      console.log('🚀 Auto-starting timer due to isPlaying change');
      startTimer();
    } else if (!isPlaying && timerRef.current && !isProcessingExternalUpdateRef.current) {
      console.log('🛑 Auto-stopping timer due to isPlaying change');
      stopTimer();
    }
  }, [isPlaying, currentSegmentId, startTimer, stopTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  };
};
