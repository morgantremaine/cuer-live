
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';

export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
}

interface UseShowcallerStateProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  onShowcallerStateChange?: (state: ShowcallerState) => void;
}

export const useShowcallerState = ({
  items,
  updateItem,
  onShowcallerStateChange
}: UseShowcallerStateProps) => {
  const [showcallerState, setShowcallerState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString()
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stateChangeCallbackRef = useRef(onShowcallerStateChange);
  stateChangeCallbackRef.current = onShowcallerStateChange;

  // Helper function to convert time string to seconds
  const timeToSeconds = useCallback((timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }, []);

  // Helper function to get next/previous segments
  const getNextSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      if (items[i].type === 'regular') {
        return items[i];
      }
    }
    return null;
  }, [items]);

  const getPreviousSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (items[i].type === 'regular') {
        return items[i];
      }
    }
    return null;
  }, [items]);

  // Update showcaller state and notify parent
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    setShowcallerState(updatedState);
    
    // Notify parent component of state change for persistence
    if (stateChangeCallbackRef.current) {
      stateChangeCallbackRef.current(updatedState);
    }
  }, [showcallerState]);

  // Clear current status from all items
  const clearCurrentStatus = useCallback(() => {
    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'completed');
      }
    });
  }, [items, updateItem]);

  // Set current segment and update status
  const setCurrentSegment = useCallback((segmentId: string) => {
    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    if (segment && segment.type === 'regular') {
      updateItem(segmentId, 'status', 'current');
      const duration = timeToSeconds(segment.duration);
      
      updateShowcallerState({
        currentSegmentId: segmentId,
        timeRemaining: duration,
        playbackStartTime: Date.now()
      });
    }
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState]);

  // Timer logic
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Time's up, advance to next segment
          if (prevState.currentSegmentId) {
            updateItem(prevState.currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration);
              updateItem(nextSegment.id, 'status', 'current');
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: Date.now(),
                lastUpdate: new Date().toISOString()
              };
              
              if (stateChangeCallbackRef.current) {
                stateChangeCallbackRef.current(newState);
              }
              
              return newState;
            } else {
              // No more segments, stop playback
              const newState = {
                ...prevState,
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0,
                playbackStartTime: null,
                lastUpdate: new Date().toISOString()
              };
              
              if (stateChangeCallbackRef.current) {
                stateChangeCallbackRef.current(newState);
              }
              
              return newState;
            }
          }
          return prevState;
        }
        
        const newState = {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        if (stateChangeCallbackRef.current) {
          stateChangeCallbackRef.current(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [updateItem, getNextSegment, timeToSeconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    if (selectedSegmentId) {
      // Mark segments before selected as upcoming
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (item.type === 'regular') {
          if (index < selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          } else if (index > selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          }
        }
      });
      setCurrentSegment(selectedSegmentId);
    }
    
    updateShowcallerState({ isPlaying: true });
    startTimer();
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, startTimer]);

  const pause = useCallback(() => {
    updateShowcallerState({ isPlaying: false });
    stopTimer();
  }, [updateShowcallerState, stopTimer]);

  const forward = useCallback(() => {
    if (showcallerState.currentSegmentId) {
      const nextSegment = getNextSegment(showcallerState.currentSegmentId);
      if (nextSegment) {
        updateItem(showcallerState.currentSegmentId, 'status', 'completed');
        setCurrentSegment(nextSegment.id);
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getNextSegment, updateItem, setCurrentSegment, startTimer]);

  const backward = useCallback(() => {
    if (showcallerState.currentSegmentId) {
      const prevSegment = getPreviousSegment(showcallerState.currentSegmentId);
      if (prevSegment) {
        updateItem(showcallerState.currentSegmentId, 'status', 'upcoming');
        setCurrentSegment(prevSegment.id);
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getPreviousSegment, updateItem, setCurrentSegment, startTimer]);

  // Apply external showcaller state (from realtime updates)
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    // Only apply if the external state is newer
    if (new Date(externalState.lastUpdate) > new Date(showcallerState.lastUpdate)) {
      console.log('📺 Applying external showcaller state:', externalState);
      
      // Clear all current statuses first
      clearCurrentStatus();
      
      // Apply the external state
      if (externalState.currentSegmentId) {
        const segment = items.find(item => item.id === externalState.currentSegmentId);
        if (segment) {
          updateItem(externalState.currentSegmentId, 'status', 'current');
        }
      }
      
      setShowcallerState(externalState);
      
      // Handle timer state
      if (externalState.isPlaying && externalState.currentSegmentId) {
        startTimer();
      } else {
        stopTimer();
      }
    }
  }, [showcallerState.lastUpdate, clearCurrentStatus, items, updateItem, startTimer, stopTimer]);

  // Initialize current segment on mount if none exists
  useEffect(() => {
    if (!showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration);
        updateShowcallerState({
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        });
      }
    }
  }, [items, showcallerState.currentSegmentId, timeToSeconds, updateShowcallerState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining
  };
};
