
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
  trackOwnUpdate?: (lastUpdate: string) => void;
}

export const useShowcallerState = ({
  items,
  updateItem,
  onShowcallerStateChange,
  userId,
  trackOwnUpdate
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

  // Update showcaller state with control logic
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('📺 Updating showcaller state:', updatedState);
    setShowcallerState(updatedState);
    
    // Track this update as our own before syncing
    if (shouldSync && trackOwnUpdate) {
      trackOwnUpdate(updatedState.lastUpdate);
    }
    
    // Only sync if this user is the controller and shouldSync is true
    if (shouldSync && isController() && stateChangeCallbackRef.current) {
      console.log('📺 Syncing state change');
      stateChangeCallbackRef.current(updatedState);
    }
  }, [showcallerState, isController, trackOwnUpdate]);

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

  // Enhanced timer logic - runs for both controller and non-controller
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    console.log('📺 Starting timer', isController() ? '(controller)' : '(display only)');
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Only controller handles segment advancement
          if (isController() && prevState.currentSegmentId) {
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
              
              // Track and sync segment advancement immediately
              if (trackOwnUpdate) {
                trackOwnUpdate(newState.lastUpdate);
              }
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
              
              if (trackOwnUpdate) {
                trackOwnUpdate(newState.lastUpdate);
              }
              if (stateChangeCallbackRef.current) {
                stateChangeCallbackRef.current(newState);
              }
              
              return newState;
            }
          } else {
            // Non-controller just stops at 0
            return {
              ...prevState,
              timeRemaining: 0,
              isPlaying: false
            };
          }
        }
        
        // Regular timer tick
        const newState = {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        // Only controller syncs state changes, and only every 10 seconds
        if (isController() && prevState.timeRemaining % 10 === 0 && stateChangeCallbackRef.current) {
          if (trackOwnUpdate) {
            trackOwnUpdate(newState.lastUpdate);
          }
          stateChangeCallbackRef.current(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [isController, updateItem, getNextSegment, timeToSeconds, userId, trackOwnUpdate]);

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

  // External state application with improved timer sync
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
    
    // Restart timer for both controller and non-controller if playing
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting timer after sync');
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, clearCurrentStatus, items, updateItem, timeToSeconds, startTimer]);

  // Initialize current segment on mount if none exists
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
