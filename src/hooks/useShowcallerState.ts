
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

interface UseShowcallerStateProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  onShowcallerStateChange?: (state: ShowcallerState) => void;
  userId?: string;
}

export const useShowcallerState = ({
  items,
  updateItem,
  onShowcallerStateChange,
  userId
}: UseShowcallerStateProps) => {
  const [showcallerState, setShowcallerState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString(),
    controllerId: null
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stateChangeCallbackRef = useRef(onShowcallerStateChange);
  const hasInitialized = useRef(false);
  const lastSyncedStateRef = useRef<string | null>(null);
  
  // Keep callback ref updated
  stateChangeCallbackRef.current = onShowcallerStateChange;

  // Check if current user is the controller
  const isController = useCallback(() => {
    return showcallerState.controllerId === userId || showcallerState.controllerId === null;
  }, [showcallerState.controllerId, userId]);

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

  // Update showcaller state with proper control logic
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('📺 Updating showcaller state:', updatedState);
    setShowcallerState(updatedState);
    
    // Only sync if this user is the controller and shouldSync is true
    if (shouldSync && isController() && stateChangeCallbackRef.current) {
      console.log('📺 Syncing state change');
      stateChangeCallbackRef.current(updatedState);
    }
  }, [showcallerState, isController]);

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
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true);
    }
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState, userId]);

  // Enhanced timer logic with better synchronization
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Only start timer if we're the controller
    if (!isController()) {
      console.log('📺 Not controller, not starting timer');
      return;
    }

    console.log('📺 Starting timer');
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        // Double-check we're still the controller
        if (prevState.controllerId !== userId) {
          return prevState;
        }

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
              
              // Sync segment advancement immediately
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
                controllerId: null,
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
        
        // Regular timer tick
        const newState = {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        // Only sync every 10 seconds to reduce database load
        const shouldSync = prevState.timeRemaining % 10 === 0;
        if (shouldSync && stateChangeCallbackRef.current) {
          stateChangeCallbackRef.current(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [isController, updateItem, getNextSegment, timeToSeconds, userId]);

  // Enhanced observer timer for non-controllers
  const startObserverTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    console.log('📺 Starting observer timer (non-controller)');
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        // Stop if no longer playing or we became controller
        if (!prevState.isPlaying || prevState.controllerId === userId) {
          return prevState;
        }
        
        return {
          ...prevState,
          timeRemaining: Math.max(0, prevState.timeRemaining - 1),
          lastUpdate: new Date().toISOString()
        };
      });
    }, 1000);
  }, [userId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('📺 Stopped timer');
    }
  }, []);

  // Control functions - take control when user acts
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Play called with segmentId:', selectedSegmentId);
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
      playbackStartTime,
      controllerId: userId
    }, true);
    
    startTimer();
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, startTimer, userId]);

  const pause = useCallback(() => {
    console.log('📺 Pause called');
    stopTimer();
    updateShowcallerState({ 
      isPlaying: false,
      playbackStartTime: null,
      controllerId: null
    }, true);
  }, [updateShowcallerState, stopTimer]);

  const forward = useCallback(() => {
    console.log('📺 Forward called');
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
    console.log('📺 Backward called');
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

  // Enhanced external state application with better timer synchronization
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    // Prevent applying the same state multiple times
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;

    console.log('📺 Applying external showcaller state:', externalState);
    
    // Always stop our current timer first
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
    
    // Calculate synchronized time remaining if playing
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
        
        console.log('📺 Synchronized time remaining:', syncedTimeRemaining, 'from elapsed:', elapsedTime);
      }
    }
    
    // Set the synchronized state
    setShowcallerState(synchronizedState);
    
    // Handle timer based on whether we're the controller or not
    if (synchronizedState.isPlaying) {
      if (synchronizedState.controllerId === userId) {
        // We are the controller, start control timer
        console.log('📺 Starting control timer after sync');
        setTimeout(() => startTimer(), 100); // Small delay to ensure state is set
      } else if (synchronizedState.controllerId && synchronizedState.controllerId !== userId) {
        // Someone else is controlling, start observer timer
        console.log('📺 Starting observer timer after sync');
        setTimeout(() => startObserverTimer(), 100);
      }
    }
  }, [stopTimer, clearCurrentStatus, items, updateItem, timeToSeconds, userId, startTimer, startObserverTimer]);

  // Initialize current segment on mount if none exists - with proper initialization guard
  useEffect(() => {
    if (!hasInitialized.current && !showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration);
        console.log('📺 Initializing with first segment:', firstSegment.id);
        setShowcallerState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
        hasInitialized.current = true;
      }
    }
  }, [items.length, showcallerState.currentSegmentId, timeToSeconds]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining,
    isController: isController()
  }), [
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isController
  ]);
};
