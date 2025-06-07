
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
  externalShowcallerState?: ShowcallerState | null
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastPlayStartTimeRef = useRef<number | undefined>(undefined);

  // Sync with external state when it changes (from real-time updates)
  useEffect(() => {
    if (externalShowcallerState && 
        (externalShowcallerState.currentSegmentId !== currentSegmentId ||
         externalShowcallerState.isPlaying !== isPlaying)) {
      
      console.log('📡 Syncing showcaller state from remote:', externalShowcallerState);
      
      setCurrentSegmentId(externalShowcallerState.currentSegmentId);
      setIsPlaying(externalShowcallerState.isPlaying);
      
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
    }
  }, [externalShowcallerState, currentSegmentId, isPlaying]);

  // Broadcast state changes to other clients
  const broadcastState = useCallback((newState: Partial<ShowcallerState>) => {
    const fullState: ShowcallerState = {
      isPlaying: newState.isPlaying ?? isPlaying,
      currentSegmentId: newState.currentSegmentId ?? currentSegmentId,
      timeRemaining: newState.timeRemaining ?? timeRemaining,
      lastPlayStartTime: newState.isPlaying ? (lastPlayStartTimeRef.current || Date.now()) : undefined
    };
    
    // Only broadcast if this is our own change (prevent infinite loops)
    const now = Date.now();
    if (now - lastSyncTimeRef.current > 500) { // Debounce broadcasts
      onShowcallerStateChange?.(fullState);
      lastSyncTimeRef.current = now;
    }
  }, [isPlaying, currentSegmentId, timeRemaining, onShowcallerStateChange]);

  // Set default current segment to first non-header item (A1) on mount
  useEffect(() => {
    if (!currentSegmentId && items.length > 0 && !externalShowcallerState) {
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
  }, [items, currentSegmentId, externalShowcallerState, broadcastState]);

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

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Store when playback started for external sync
    lastPlayStartTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
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
        
        // Broadcast updated time occasionally
        if (newTime % 5 === 0) { // Every 5 seconds
          broadcastState({
            timeRemaining: newTime,
            isPlaying: true
          });
        }
        
        return newTime;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    lastPlayStartTimeRef.current = undefined;
  };

  const play = (selectedSegmentId?: string) => {
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
    broadcastState({ isPlaying: true, lastPlayStartTime: lastPlayStartTimeRef.current });
    startTimer();
  };

  const pause = () => {
    setIsPlaying(false);
    lastPlayStartTimeRef.current = undefined;
    broadcastState({ isPlaying: false });
    stopTimer();
  };

  const forward = () => {
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
  };

  const backward = () => {
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
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentSegmentId && !externalShowcallerState?.isPlaying) {
      startTimer();
    } else if (!isPlaying || externalShowcallerState?.isPlaying === false) {
      stopTimer();
    }
    
    return () => stopTimer();
  }, [isPlaying, currentSegmentId, externalShowcallerState?.isPlaying]);

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
