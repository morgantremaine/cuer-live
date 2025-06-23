
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerPersistence } from './useShowcallerPersistence';

export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

interface UseShowcallerVisualStateProps {
  items: RundownItem[];
  rundownId?: string;
  userId?: string;
}

export const useShowcallerVisualState = ({
  items,
  rundownId,
  userId
}: UseShowcallerVisualStateProps) => {
  const [visualState, setVisualState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString(),
    controllerId: null
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const isApplyingExternalState = useRef(false);
  const hasInitialized = useRef(false);

  const { saveShowcallerState } = useShowcallerPersistence({
    rundownId: rundownId || null,
    trackOwnUpdate: (timestamp: string) => {
      lastSyncedStateRef.current = timestamp;
    }
  });

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

  // Get next/previous segments
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

  // Start timer for countdown
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setVisualState(prevState => {
        if (prevState.timeRemaining <= 1) {
          // Time is up, handle segment completion
          if (prevState.currentSegmentId && prevState.controllerId === userId) {
            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration || '00:00');
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: Date.now(),
                lastUpdate: new Date().toISOString()
              };
              
              // Save state to persistence
              saveShowcallerState(newState);
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
              
              saveShowcallerState(newState);
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
        
        return {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
      });
    }, 1000);
  }, [getNextSegment, timeToSeconds, userId, saveShowcallerState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Play called with segmentId:', selectedSegmentId, 'by user:', userId);
    
    let targetSegmentId = selectedSegmentId;
    
    if (selectedSegmentId) {
      // Playing from a specific segment
      targetSegmentId = selectedSegmentId;
    } else if (!visualState.currentSegmentId) {
      // No current segment, start from first
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        targetSegmentId = firstSegment.id;
      }
    } else {
      // Continue from current segment
      targetSegmentId = visualState.currentSegmentId;
    }
    
    if (targetSegmentId) {
      const segment = items.find(item => item.id === targetSegmentId);
      if (segment) {
        const duration = timeToSeconds(segment.duration || '00:00');
        
        const newState = {
          ...visualState,
          isPlaying: true,
          currentSegmentId: targetSegmentId,
          timeRemaining: selectedSegmentId ? duration : visualState.timeRemaining || duration,
          playbackStartTime: Date.now(),
          controllerId: userId,
          lastUpdate: new Date().toISOString()
        };
        
        setVisualState(newState);
        saveShowcallerState(newState);
        startTimer();
      }
    }
  }, [items, visualState, timeToSeconds, userId, saveShowcallerState, startTimer]);

  const pause = useCallback(() => {
    console.log('📺 Pause called by user:', userId);
    
    stopTimer();
    
    const newState = {
      ...visualState,
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    saveShowcallerState(newState);
  }, [visualState, userId, saveShowcallerState, stopTimer]);

  const forward = useCallback(() => {
    console.log('📺 Forward called by user:', userId);

    if (visualState.currentSegmentId) {
      const nextSegment = getNextSegment(visualState.currentSegmentId);
      if (nextSegment) {
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        
        const newState = {
          ...visualState,
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: visualState.isPlaying ? Date.now() : null,
          controllerId: userId,
          lastUpdate: new Date().toISOString()
        };
        
        setVisualState(newState);
        saveShowcallerState(newState);
        
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, getNextSegment, timeToSeconds, userId, saveShowcallerState, startTimer]);

  const backward = useCallback(() => {
    console.log('📺 Backward called by user:', userId);

    if (visualState.currentSegmentId) {
      const prevSegment = getPreviousSegment(visualState.currentSegmentId);
      if (prevSegment) {
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        
        const newState = {
          ...visualState,
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: visualState.isPlaying ? Date.now() : null,
          controllerId: userId,
          lastUpdate: new Date().toISOString()
        };
        
        setVisualState(newState);
        saveShowcallerState(newState);
        
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, getPreviousSegment, timeToSeconds, userId, saveShowcallerState, startTimer]);

  const reset = useCallback(() => {
    console.log('📺 Reset called by user:', userId);
    
    stopTimer();
    
    const newState = {
      isPlaying: false,
      currentSegmentId: null,
      timeRemaining: 0,
      playbackStartTime: null,
      controllerId: null,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    saveShowcallerState(newState);
  }, [userId, saveShowcallerState, stopTimer]);

  // Apply external showcaller state (from database or other clients)
  const applyExternalVisualState = useCallback((externalState: ShowcallerState) => {
    // Prevent applying our own updates
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    
    console.log('📺 Applying external showcaller state:', {
      isPlaying: externalState.isPlaying,
      currentSegment: externalState.currentSegmentId,
      controller: externalState.controllerId
    });
    
    isApplyingExternalState.current = true;
    lastSyncedStateRef.current = externalState.lastUpdate;
    
    stopTimer();
    
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
    
    setVisualState(synchronizedState);
    
    // Restart timer if playing and there's time remaining
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting timer after external state application');
      setTimeout(() => {
        startTimer();
        isApplyingExternalState.current = false;
      }, 100);
    } else {
      isApplyingExternalState.current = false;
    }
  }, [items, timeToSeconds, stopTimer, startTimer]);

  // Initialize first segment only if no external state is being applied and not initialized yet
  useEffect(() => {
    if (!visualState.currentSegmentId && 
        items.length > 0 && 
        !isApplyingExternalState.current && 
        !hasInitialized.current) {
      
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        console.log('📺 Initializing with first segment:', firstSegment.id);
        
        setVisualState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
        
        hasInitialized.current = true;
      }
    }
  }, [items.length, visualState.currentSegmentId, timeToSeconds]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    visualState,
    play,
    pause,
    forward,
    backward,
    reset,
    applyExternalVisualState,
    isPlaying: visualState.isPlaying,
    currentSegmentId: visualState.currentSegmentId,
    timeRemaining: visualState.timeRemaining,
    isController: visualState.controllerId === userId,
    trackOwnUpdate: (timestamp: string) => {
      lastSyncedStateRef.current = timestamp;
    }
  };
};
