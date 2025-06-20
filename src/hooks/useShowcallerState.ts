
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

  // Enhanced showcaller update marking with longer duration
  const markAsShowcallerUpdate = useCallback(() => {
    if (setShowcallerUpdate) {
      setShowcallerUpdate(true);
      
      // Clear any existing timeout
      if (showcallerUpdateTimeoutRef.current) {
        clearTimeout(showcallerUpdateTimeoutRef.current);
      }
      
      // Extended timeout to ensure the flag stays active during all related operations
      showcallerUpdateTimeoutRef.current = setTimeout(() => {
        setShowcallerUpdate(false);
      }, 8000); // 8 seconds to cover all related database operations and prevent autosave
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

  // Update showcaller state with enhanced change tracking exclusion
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    // Mark as showcaller update with extended duration
    markAsShowcallerUpdate();

    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    setShowcallerState(updatedState);
    
    if (shouldSync && stateChangeCallbackRef.current) {
      debouncedSync(updatedState);
    }
  }, [showcallerState, debouncedSync, markAsShowcallerUpdate]);

  // Clear current status from all items with showcaller update marking
  const clearCurrentStatus = useCallback(() => {
    markAsShowcallerUpdate();

    items.forEach(item => {
      if (item.status === 'current') {
        updateItem(item.id, 'status', 'completed');
      }
    });
  }, [items, updateItem, markAsShowcallerUpdate]);

  const setCurrentSegment = useCallback((segmentId: string) => {
    markAsShowcallerUpdate();

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
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState, userId, markAsShowcallerUpdate]);

  // Timer logic
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
            markAsShowcallerUpdate();

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
  }, [isController, updateItem, getNextSegment, timeToSeconds, trackOwnUpdate, markAsShowcallerUpdate]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions with enhanced showcaller update marking
  const play = useCallback((selectedSegmentId?: string) => {
    const playbackStartTime = Date.now();
    
    markAsShowcallerUpdate();
    
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
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, showcallerState.currentSegmentId, userId, startTimer, markAsShowcallerUpdate]);

  const pause = useCallback(() => {
    stopTimer();
    
    updateShowcallerState({ 
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true);
  }, [updateShowcallerState, stopTimer, userId]);

  // Enhanced forward/backward with better coordination
  const forward = useCallback(() => {
    markAsShowcallerUpdate();

    if (showcallerState.currentSegmentId) {
      const nextSegment = getNextSegment(showcallerState.currentSegmentId);
      if (nextSegment) {
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
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getNextSegment, updateItem, timeToSeconds, userId, updateShowcallerState, startTimer, markAsShowcallerUpdate]);

  const backward = useCallback(() => {
    markAsShowcallerUpdate();

    if (showcallerState.currentSegmentId) {
      const prevSegment = getPreviousSegment(showcallerState.currentSegmentId);
      if (prevSegment) {
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
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getPreviousSegment, updateItem, timeToSeconds, userId, updateShowcallerState, startTimer, markAsShowcallerUpdate]);

  // External state application
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;
    
    markAsShowcallerUpdate();
    
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
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
      }
    }
    
    setShowcallerState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, clearCurrentStatus, items, updateItem, timeToSeconds, startTimer, markAsShowcallerUpdate]);

  // Initialize current segment on mount if none exists
  useEffect(() => {
    if (!hasInitialized.current && !showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
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
