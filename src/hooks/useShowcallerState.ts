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
    console.log('📺 getNextSegment called with:', currentId, 'from items:', items.length);
    const currentIndex = items.findIndex(item => item.id === currentId);
    console.log('📺 Current index:', currentIndex);
    
    for (let i = currentIndex + 1; i < items.length; i++) {
      console.log('📺 Checking item at index', i, ':', items[i]);
      if (items[i].type === 'regular') {
        console.log('📺 Found next segment:', items[i]);
        return items[i];
      }
    }
    console.log('📺 No next segment found');
    return null;
  }, [items]);

  const getPreviousSegment = useCallback((currentId: string) => {
    console.log('📺 getPreviousSegment called with:', currentId, 'from items:', items.length);
    const currentIndex = items.findIndex(item => item.id === currentId);
    console.log('📺 Current index:', currentIndex);
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      console.log('📺 Checking item at index', i, ':', items[i]);
      if (items[i].type === 'regular') {
        console.log('📺 Found previous segment:', items[i]);
        return items[i];
      }
    }
    console.log('📺 No previous segment found');
    return null;
  }, [items]);

  // Update showcaller state
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('📺 Updating showcaller state:', updatedState);
    setShowcallerState(updatedState);
    
    if (shouldSync && stateChangeCallbackRef.current) {
      console.log('📺 Syncing state change');
      
      if (trackOwnUpdate) {
        trackOwnUpdate(updatedState.lastUpdate);
      }
      
      stateChangeCallbackRef.current(updatedState);
    }
  }, [showcallerState, trackOwnUpdate]);

  // Clear current status from all items
  const clearCurrentStatus = useCallback(() => {
    console.log('📺 Clearing current status from all items');
    items.forEach(item => {
      if (item.status === 'current') {
        console.log('📺 Clearing current status from:', item.id);
        updateItem(item.id, 'status', 'completed');
      }
    });
  }, [items, updateItem]);

  const setCurrentSegment = useCallback((segmentId: string) => {
    console.log('📺 setCurrentSegment called with:', segmentId);
    clearCurrentStatus();
    const segment = items.find(item => item.id === segmentId);
    console.log('📺 Found segment:', segment);
    
    if (segment && segment.type === 'regular') {
      console.log('📺 Setting segment as current:', segmentId);
      updateItem(segmentId, 'status', 'current');
      const duration = timeToSeconds(segment.duration || '00:00');
      console.log('📺 Segment duration in seconds:', duration);
      
      updateShowcallerState({
        currentSegmentId: segmentId,
        timeRemaining: duration,
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true);
    }
  }, [items, updateItem, clearCurrentStatus, timeToSeconds, updateShowcallerState, userId]);

  // Timer logic
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const isActiveController = isController();
    console.log('📺 Starting timer', isActiveController ? '(controller)' : '(display only)');
    
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Only controller handles segment advancement
          if (isActiveController && prevState.currentSegmentId) {
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
  }, [isController, updateItem, getNextSegment, timeToSeconds, trackOwnUpdate]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('📺 Stopped timer');
    }
  }, []);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Play called with segmentId:', selectedSegmentId, 'by user:', userId);
    const playbackStartTime = Date.now();
    
    if (selectedSegmentId) {
      console.log('📺 Playing specific segment:', selectedSegmentId);
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
      console.log('📺 No current segment, finding first regular item');
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        console.log('📺 Found first segment:', firstSegment.id);
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
  }, [items, updateItem, setCurrentSegment, updateShowcallerState, showcallerState.currentSegmentId, userId, startTimer]);

  const pause = useCallback(() => {
    console.log('📺 Pause called by user:', userId);
    stopTimer();
    
    updateShowcallerState({ 
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true);
  }, [updateShowcallerState, stopTimer, userId]);

  const forward = useCallback(() => {
    console.log('📺 Forward called by user:', userId, 'current segment:', showcallerState.currentSegmentId);
    if (showcallerState.currentSegmentId) {
      const nextSegment = getNextSegment(showcallerState.currentSegmentId);
      if (nextSegment) {
        console.log('📺 Moving to next segment:', nextSegment.id);
        updateItem(showcallerState.currentSegmentId, 'status', 'completed');
        
        updateShowcallerState({
          controllerId: userId
        }, true);
        
        setCurrentSegment(nextSegment.id);
        if (showcallerState.isPlaying) {
          startTimer();
        }
      } else {
        console.log('📺 No next segment available');
      }
    } else {
      console.log('📺 No current segment to move from');
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getNextSegment, updateItem, setCurrentSegment, userId, updateShowcallerState, startTimer]);

  const backward = useCallback(() => {
    console.log('📺 Backward called by user:', userId, 'current segment:', showcallerState.currentSegmentId);
    if (showcallerState.currentSegmentId) {
      const prevSegment = getPreviousSegment(showcallerState.currentSegmentId);
      if (prevSegment) {
        console.log('📺 Moving to previous segment:', prevSegment.id);
        updateItem(showcallerState.currentSegmentId, 'status', 'upcoming');
        
        updateShowcallerState({
          controllerId: userId
        }, true);
        
        setCurrentSegment(prevSegment.id);
        if (showcallerState.isPlaying) {
          startTimer();
        }
      } else {
        console.log('📺 No previous segment available');
      }
    } else {
      console.log('📺 No current segment to move from');
    }
  }, [showcallerState.currentSegmentId, showcallerState.isPlaying, getPreviousSegment, updateItem, setCurrentSegment, userId, updateShowcallerState, startTimer]);

  // External state application
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;

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
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
        
        console.log('📺 Synchronized time remaining:', syncedTimeRemaining, 'from elapsed:', elapsedTime);
      }
    }
    
    setShowcallerState(synchronizedState);
    
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
        const duration = timeToSeconds(firstSegment.duration || '00:00');
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
