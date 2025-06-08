
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
  const isApplyingExternalStateRef = useRef(false);
  const lastExternalUpdateRef = useRef<string | null>(null);
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

  // Check if we should skip saving (when applying external state)
  const shouldSkipSaving = useCallback(() => {
    return isApplyingExternalStateRef.current;
  }, []);

  // Update showcaller state and notify parent - with sync control
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    setShowcallerState(updatedState);
    
    // Only notify parent (which triggers sync) for significant changes and when not applying external state
    if (shouldSync && !shouldSkipSaving() && stateChangeCallbackRef.current) {
      stateChangeCallbackRef.current(updatedState);
    }
  }, [showcallerState, shouldSkipSaving]);

  // Clear current status from all items
  const clearCurrentStatus = useCallback(() => {
    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'completed');
      }
    });
  }, [items, updateItem]);

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
      }, true); // Sync this significant change
    }
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState]);

  // Timer logic - sync significant changes immediately
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Time's up, advance to next segment - this needs immediate sync
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
              
              // Sync significant change (segment advancement) only if not applying external state
              if (!shouldSkipSaving() && stateChangeCallbackRef.current) {
                stateChangeCallbackRef.current(newState);
              }
              
              return newState;
            } else {
              // No more segments, stop playback - sync this change
              const newState = {
                ...prevState,
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0,
                playbackStartTime: null,
                lastUpdate: new Date().toISOString()
              };
              
              if (!shouldSkipSaving() && stateChangeCallbackRef.current) {
                stateChangeCallbackRef.current(newState);
              }
              
              return newState;
            }
          }
          return prevState;
        }
        
        // Regular timer tick - only sync every 10 seconds to reduce load
        const newState = {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        // Only sync every 10 seconds for timer updates to reduce database load and not when applying external state
        const shouldSyncTimerUpdate = prevState.timeRemaining % 10 === 0;
        if (shouldSyncTimerUpdate && !shouldSkipSaving() && stateChangeCallbackRef.current) {
          stateChangeCallbackRef.current(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [updateItem, getNextSegment, timeToSeconds, shouldSkipSaving]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions - these are significant changes that should sync immediately
  const play = useCallback((selectedSegmentId?: string) => {
    const playbackStartTime = Date.now();
    
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
    
    updateShowcallerState({ 
      isPlaying: true,
      playbackStartTime
    }, true); // Sync play action immediately
    startTimer();
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, startTimer]);

  const pause = useCallback(() => {
    stopTimer();
    updateShowcallerState({ 
      isPlaying: false,
      playbackStartTime: null
    }, true); // Sync pause action immediately
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

  // Apply external showcaller state (from realtime updates) - CRITICAL for sync
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    console.log('📺 Applying external showcaller state:', externalState);
    
    // CRITICAL: Mark that we're applying external state to prevent saving
    isApplyingExternalStateRef.current = true;
    lastExternalUpdateRef.current = externalState.lastUpdate;
    
    // CRITICAL: Stop current timer first to prevent conflicts
    stopTimer();
    
    // Clear all current statuses first
    clearCurrentStatus();
    
    // Apply the external state to items
    if (externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        updateItem(externalState.currentSegmentId, 'status', 'current');
      }
    }
    
    // CRITICAL: Calculate synchronized time remaining based on shared playback start time
    let synchronizedState = { ...externalState };
    
    if (externalState.isPlaying && externalState.playbackStartTime && externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        const segmentDuration = timeToSeconds(segment.duration);
        const elapsedTime = Math.floor((Date.now() - externalState.playbackStartTime) / 1000);
        const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
        
        console.log('🕐 Synchronized timer:', {
          segmentDuration,
          elapsedTime,
          syncedTimeRemaining,
          originalTimeRemaining: externalState.timeRemaining
        });
      }
    }
    
    // Set the synchronized state immediately
    setShowcallerState(synchronizedState);
    
    // CRITICAL: Handle timer state based on external playing status
    if (synchronizedState.isPlaying && synchronizedState.currentSegmentId) {
      // If external state is playing, start our timer immediately
      startTimer();
    } else {
      // CRITICAL: If external state is not playing, ensure timer stays stopped
      // This is the key fix - we must not restart the timer if isPlaying is false
      console.log('📺 External state shows not playing - keeping timer stopped');
    }
    
    // Reset the flag after a longer delay to ensure all async operations complete
    setTimeout(() => {
      // Only reset if this was the last external update we processed
      if (lastExternalUpdateRef.current === externalState.lastUpdate) {
        isApplyingExternalStateRef.current = false;
      }
    }, 500); // Increased from 100ms to 500ms for better reliability
  }, [stopTimer, clearCurrentStatus, items, updateItem, startTimer, timeToSeconds]);

  // Initialize current segment on mount if none exists - only once
  useEffect(() => {
    if (!showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration);
        updateShowcallerState({
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }, false); // Don't sync initial setup
      }
    }
  }, [items.length]);

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
