
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
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useShowcallerState = ({
  items,
  updateItem,
  onShowcallerStateChange,
  userId,
  trackOwnUpdate,
  setShowcallerUpdate
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
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showcallerUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showcallerOperationInProgressRef = useRef(false);
  
  // Keep callback ref updated
  stateChangeCallbackRef.current = onShowcallerStateChange;

  // Check if current user is the active controller
  const isController = useCallback(() => {
    return showcallerState.controllerId === userId;
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

  // Enhanced showcaller operation marking - prevents autosave during showcaller operations
  const markShowcallerOperation = useCallback((isStarting: boolean) => {
    if (setShowcallerUpdate) {
      showcallerOperationInProgressRef.current = isStarting;
      setShowcallerUpdate(isStarting);
      
      if (isStarting) {
        // Clear any existing timeout
        if (showcallerUpdateTimeoutRef.current) {
          clearTimeout(showcallerUpdateTimeoutRef.current);
        }
        
        // Set timeout to clear the operation flag
        showcallerUpdateTimeoutRef.current = setTimeout(() => {
          showcallerOperationInProgressRef.current = false;
          if (setShowcallerUpdate) {
            setShowcallerUpdate(false);
          }
        }, 20000); // 20 seconds to ensure all related operations complete
      }
    }
  }, [setShowcallerUpdate]);

  // Debounced sync function to prevent rapid fire updates
  const debouncedSync = useCallback((newState: ShowcallerState) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      if (trackOwnUpdate) {
        trackOwnUpdate(newState.lastUpdate);
      }
      if (stateChangeCallbackRef.current) {
        stateChangeCallbackRef.current(newState);
      }
    }, 150);
  }, [trackOwnUpdate]);

  // Update showcaller state with enhanced change tracking prevention
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    // Mark as showcaller operation at the start
    markShowcallerOperation(true);

    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    setShowcallerState(updatedState);
    
    if (shouldSync && stateChangeCallbackRef.current) {
      debouncedSync(updatedState);
    }
  }, [showcallerState, debouncedSync, markShowcallerOperation]);

  // Clear current status from all items with showcaller operation marking
  const clearCurrentStatus = useCallback(() => {
    markShowcallerOperation(true);
    console.log('📺 Clearing current status from all items');

    items.forEach(item => {
      if (item.status === 'current') {
        console.log('📺 Clearing current status from:', item.id);
        updateItem(item.id, 'status', 'completed');
      }
    });
  }, [items, updateItem, markShowcallerOperation]);

  const setCurrentSegment = useCallback((segmentId: string) => {
    markShowcallerOperation(true);

    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    
    if (segment && segment.type === 'regular') {
      updateItem(segmentId, 'status', 'current');
      const duration = timeToSeconds(segment.duration || '00:00');
      
      updateShowcallerState({
        currentSegmentId: segmentId,
        timeRemaining: duration,
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true);
    }
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState, userId, markShowcallerOperation]);

  // Timer logic with enhanced showcaller operation marking
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const isActiveController = isController();
    
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Only controller handles segment advancement
          if (isActiveController && prevState.currentSegmentId) {
            markShowcallerOperation(true);

            updateItem(prevState.currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration || '00:00');
              updateItem(nextSegment.id, 'status', 'current');
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: Date.now(),
                lastUpdate: new Date().toISOString()
              };
              
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
        
        // Sync every 30 seconds to reduce conflicts
        if (isActiveController && prevState.timeRemaining % 30 === 0 && stateChangeCallbackRef.current) {
          if (trackOwnUpdate) {
            trackOwnUpdate(newState.lastUpdate);
          }
          stateChangeCallbackRef.current(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [isController, updateItem, getNextSegment, timeToSeconds, trackOwnUpdate, markShowcallerOperation]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions with enhanced showcaller operation marking
  const play = useCallback((selectedSegmentId?: string) => {
    const playbackStartTime = Date.now();
    
    markShowcallerOperation(true);
    console.log('📺 Play called with segmentId:', selectedSegmentId, 'by user:', userId);
    
    if (selectedSegmentId) {
      // Mark segments before selected as completed, after as upcoming
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (item.type === 'regular') {
          if (index < selectedIndex) {
            updateItem(item.id, 'status', 'completed');
          } else if (index > selectedIndex) {
            updateItem(item.id, 'status', 'upcoming');
          }
        }
      });
      setCurrentSegment(selectedSegmentId);
    } else if (!showcallerState.currentSegmentId) {
      // No current segment, find first regular item
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        setCurrentSegment(firstSegment.id);
      }
    } else {
      // Resume current segment
      const currentSegment = items.find(item => item.id === showcallerState.currentSegmentId);
      if (currentSegment) {
        updateItem(currentSegment.id, 'status', 'current');
      }
    }
    
    updateShowcallerState({ 
      isPlaying: true,
      playbackStartTime,
      controllerId: userId
    }, true);
    
    startTimer();
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, showcallerState.currentSegmentId, userId, startTimer, markShowcallerOperation]);

  const pause = useCallback(() => {
    markShowcallerOperation(true);
    console.log('📺 Pause called by user:', userId);
    
    stopTimer();
    
    updateShowcallerState({ 
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true);
  }, [updateShowcallerState, stopTimer, userId, markShowcallerOperation]);

  // Enhanced forward/backward with better coordination
  const forward = useCallback(() => {
    markShowcallerOperation(true);
    console.log('📺 Forward called by user:', userId, 'current segment:', showcallerState.currentSegmentId);

    if (showcallerState.currentSegmentId) {
      const nextSegment = getNextSegment(showcallerState.currentSegmentId);
      if (nextSegment) {
        console.log('📺 Moving to next segment:', nextSegment.id);
        // Batch the operations to reduce conflicts
        updateItem(showcallerState.currentSegmentId, 'status', 'completed');
        updateItem(nextSegment.id, 'status', 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        
        // Single coordinated state update
        updateShowcallerState({
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: showcallerState.isPlaying ? Date.now() : null,
          controllerId: userId
        }, true);
        
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getNextSegment, updateItem, timeToSeconds, userId, updateShowcallerState, startTimer, markShowcallerOperation]);

  const backward = useCallback(() => {
    markShowcallerOperation(true);
    console.log('📺 Backward called by user:', userId, 'current segment:', showcallerState.currentSegmentId);

    if (showcallerState.currentSegmentId) {
      const prevSegment = getPreviousSegment(showcallerState.currentSegmentId);
      if (prevSegment) {
        console.log('📺 Moving to previous segment:', prevSegment.id);
        // Batch the operations to reduce conflicts
        updateItem(showcallerState.currentSegmentId, 'status', 'upcoming');
        updateItem(prevSegment.id, 'status', 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        
        // Single coordinated state update
        updateShowcallerState({
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: showcallerState.isPlaying ? Date.now() : null,
          controllerId: userId
        }, true);
        
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getPreviousSegment, updateItem, timeToSeconds, userId, updateShowcallerState, startTimer, markShowcallerOperation]);

  // External state application
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;
    
    markShowcallerOperation(true);
    console.log('📺 Applying external showcaller state from controller:', externalState.controllerId);
    
    stopTimer();
    clearCurrentStatus();
    
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
        const segmentDuration = timeToSeconds(segment.duration || '00:00');
        const elapsedTime = Math.floor((Date.now() - externalState.playbackStartTime) / 1000);
        const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
        
        console.log('📺 Synchronized time remaining:', syncedTimeRemaining, 'from elapsed:', elapsedTime);
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
      }
    }
    
    setShowcallerState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting timer after sync');
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, clearCurrentStatus, items, updateItem, timeToSeconds, startTimer, markShowcallerOperation]);

  // Initialize current segment on mount if none exists
  useEffect(() => {
    if (!hasInitialized.current && !showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        console.log('📺 Initializing with first segment:', firstSegment.id);
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        setShowcallerState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
        hasInitialized.current = true;
      }
    }
  }, [items.length, showcallerState.currentSegmentId, timeToSeconds]);

  // Cleanup timer and sync timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (showcallerUpdateTimeoutRef.current) {
        clearTimeout(showcallerUpdateTimeoutRef.current);
      }
    };
  }, []);

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
