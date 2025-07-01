
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';

export interface UnifiedShowcallerState {
  currentItemStatuses: Map<string, string>;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
  isInitialized: boolean;
  isController: boolean;
}

export interface TimingStatus {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

interface UseShowcallerUnifiedTimingProps {
  items: RundownItem[];
  rundownId: string | null;
  rundownStartTime: string;
  userId?: string;
  onSaveState?: (state: any) => Promise<void>;
}

export const useShowcallerUnifiedTiming = ({
  items,
  rundownId,
  rundownStartTime,
  userId,
  onSaveState
}: UseShowcallerUnifiedTimingProps) => {
  const [state, setState] = useState<UnifiedShowcallerState>({
    currentItemStatuses: new Map(),
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString(),
    controllerId: null,
    isInitialized: false,
    isController: false
  });

  // Single timer reference and timing state
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdvancementTimeRef = useRef<number>(0);
  const isAdvancingRef = useRef<boolean>(false);
  const lastDisplayUpdateRef = useRef<number>(0);
  const displayedSecondsRef = useRef<number>(0);

  // Precise time utilities
  const getPreciseTime = useCallback((): number => {
    return performance.now() + performance.timeOrigin;
  }, []);

  const timeToMilliseconds = useCallback((timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return (minutes * 60 + seconds) * 1000;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    return 0;
  }, []);

  const timeToSeconds = useCallback((timeStr: string) => {
    return Math.round(timeToMilliseconds(timeStr) / 1000);
  }, [timeToMilliseconds]);

  const secondsToTime = useCallback((seconds: number): string => {
    if (seconds < 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Navigation helpers
  const getNextSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items]);

  const getPreviousSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items]);

  // Unified timing calculation that provides both countdown and over/under
  const calculateUnifiedTiming = useCallback(() => {
    if (!state.currentSegmentId || !state.playbackStartTime) {
      return {
        timeRemaining: 0,
        timingStatus: {
          isOnTime: false,
          isAhead: false,
          timeDifference: '00:00:00',
          isVisible: false
        }
      };
    }

    const currentSegment = items.find(item => item.id === state.currentSegmentId);
    if (!currentSegment) {
      return {
        timeRemaining: 0,
        timingStatus: {
          isOnTime: false,
          isAhead: false,
          timeDifference: '00:00:00',
          isVisible: false
        }
      };
    }

    const currentTime = getPreciseTime();
    const elapsedMs = currentTime - state.playbackStartTime;
    const segmentDurationMs = timeToMilliseconds(currentSegment.duration || '00:00');
    const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);
    
    // Use Math.floor for stable second calculation - only changes when we cross a full second boundary
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    // Only update displayed seconds if we've actually crossed a second boundary AND enough time has passed
    const now = Date.now();
    if (remainingSeconds !== displayedSecondsRef.current && (now - lastDisplayUpdateRef.current) >= 500) {
      displayedSecondsRef.current = remainingSeconds;
      lastDisplayUpdateRef.current = now;
    }

    // Calculate over/under timing if playing and have start time
    let timingStatus: TimingStatus = {
      isOnTime: false,
      isAhead: false,
      timeDifference: '00:00:00',
      isVisible: false
    };

    if (state.isPlaying && rundownStartTime) {
      // Calculate showcaller elapsed time
      const currentSegmentIndex = items.findIndex(item => item.id === state.currentSegmentId);
      let showcallerElapsedSeconds = 0;
      
      // Add up durations of completed segments
      for (let i = 0; i < currentSegmentIndex; i++) {
        const item = items[i];
        if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
          showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
        }
      }
      
      // Add elapsed time in current segment
      const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
      const elapsedInCurrentSegment = currentSegmentDuration - displayedSecondsRef.current;
      showcallerElapsedSeconds += elapsedInCurrentSegment;

      // Calculate real elapsed time since rundown start
      const currentTimeString = new Date().toTimeString().slice(0, 8);
      const currentTimeSeconds = timeToSeconds(currentTimeString);
      const rundownStartSeconds = timeToSeconds(rundownStartTime);
      
      let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      if (realElapsedSeconds < 0) {
        realElapsedSeconds += 24 * 3600; // Handle day boundary
      }
      
      const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
      const isOnTime = Math.abs(differenceSeconds) <= 3;
      const isAhead = differenceSeconds > 3;
      
      timingStatus = {
        isOnTime,
        isAhead,
        timeDifference: secondsToTime(Math.abs(differenceSeconds)),
        isVisible: true
      };
    }

    return {
      timeRemaining: displayedSecondsRef.current,
      timingStatus
    };
  }, [state.currentSegmentId, state.playbackStartTime, state.isPlaying, items, rundownStartTime, timeToMilliseconds, timeToSeconds, secondsToTime, getPreciseTime]);

  // Unified timer that handles both countdown and timing calculations
  const startUnifiedTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const updateTimer = () => {
      setState(prevState => {
        if (!prevState.currentSegmentId || !prevState.isPlaying || !prevState.playbackStartTime) {
          return prevState;
        }

        const { timeRemaining, timingStatus } = calculateUnifiedTiming();
        
        // Check for segment advancement
        if (timeRemaining <= 0) {
          // Rate limiting for advancement
          const currentTime = getPreciseTime();
          if (currentTime - lastAdvancementTimeRef.current < 1500 || isAdvancingRef.current) {
            return { ...prevState, timeRemaining: 0 };
          }

          if (prevState.isController) {
            isAdvancingRef.current = true;
            lastAdvancementTimeRef.current = currentTime;
            displayedSecondsRef.current = 0;

            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration || '00:00');
              const newStatuses = new Map(prevState.currentItemStatuses);
              newStatuses.set(prevState.currentSegmentId, 'completed');
              newStatuses.set(nextSegment.id, 'current');
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: currentTime,
                currentItemStatuses: newStatuses,
                lastUpdate: new Date().toISOString()
              };
              
              displayedSecondsRef.current = duration;
              
              if (onSaveState) {
                onSaveState(newState);
              }
              
              setTimeout(() => {
                isAdvancingRef.current = false;
                if (newState.isPlaying) {
                  timerRef.current = setTimeout(updateTimer, 500);
                }
              }, 100);
              
              return newState;
            } else {
              // End of rundown
              isAdvancingRef.current = false;
              return {
                ...prevState,
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0,
                playbackStartTime: null,
                controllerId: null,
                lastUpdate: new Date().toISOString()
              };
            }
          }
        }
        
        return {
          ...prevState,
          timeRemaining,
          lastUpdate: new Date().toISOString()
        };
      });

      // Schedule next update with 500ms interval for smooth but not excessive updates
      timerRef.current = setTimeout(updateTimer, 500);
    };

    updateTimer();
  }, [calculateUnifiedTiming, getNextSegment, timeToSeconds, getPreciseTime, onSaveState]);

  const stopUnifiedTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isAdvancingRef.current = false;
    displayedSecondsRef.current = 0;
  }, []);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    const preciseStartTime = getPreciseTime();
    const newStatuses = new Map();
    
    if (selectedSegmentId) {
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (item.type === 'regular' && !isFloated(item)) {
          if (index < selectedIndex) {
            newStatuses.set(item.id, 'completed');
          } else if (index === selectedIndex) {
            newStatuses.set(item.id, 'current');
          }
        }
      });
      
      const segment = items.find(item => item.id === selectedSegmentId);
      const duration = segment ? timeToSeconds(segment.duration || '00:00') : 0;
      
      // Set initial displayed seconds immediately
      displayedSecondsRef.current = duration;
      
      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentSegmentId: selectedSegmentId,
        timeRemaining: duration,
        playbackStartTime: preciseStartTime,
        controllerId: userId,
        currentItemStatuses: newStatuses,
        lastUpdate: new Date().toISOString(),
        isController: userId ? true : false
      }));
      
      if (onSaveState) {
        const stateToSave = {
          isPlaying: true,
          currentSegmentId: selectedSegmentId,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses,
          lastUpdate: new Date().toISOString()
        };
        onSaveState(stateToSave);
      }
    } else if (!state.currentSegmentId) {
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        newStatuses.set(firstSegment.id, 'current');
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        
        displayedSecondsRef.current = duration;
        
        setState(prev => ({
          ...prev,
          isPlaying: true,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses,
          lastUpdate: new Date().toISOString(),
          isController: userId ? true : false
        }));
        
        if (onSaveState) {
          const stateToSave = {
            isPlaying: true,
            currentSegmentId: firstSegment.id,
            timeRemaining: duration,
            playbackStartTime: preciseStartTime,
            controllerId: userId,
            currentItemStatuses: newStatuses,
            lastUpdate: new Date().toISOString()
          };
          onSaveState(stateToSave);
        }
      }
    } else {
      setState(prev => ({
        ...prev,
        isPlaying: true,
        playbackStartTime: preciseStartTime,
        controllerId: userId,
        lastUpdate: new Date().toISOString(),
        isController: userId ? true : false
      }));
      
      if (onSaveState) {
        const stateToSave = {
          ...state,
          isPlaying: true,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          lastUpdate: new Date().toISOString()
        };
        onSaveState(stateToSave);
      }
    }
    
    setTimeout(() => startUnifiedTimer(), 10);
  }, [items, state.currentSegmentId, userId, timeToSeconds, startUnifiedTimer, getPreciseTime, onSaveState]);

  const pause = useCallback(() => {
    stopUnifiedTimer();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    }));
    
    if (onSaveState) {
      const stateToSave = {
        ...state,
        isPlaying: false,
        playbackStartTime: null,
        controllerId: userId,
        lastUpdate: new Date().toISOString()
      };
      onSaveState(stateToSave);
    }
  }, [stopUnifiedTimer, userId, onSaveState, state]);

  const forward = useCallback(() => {
    if (state.currentSegmentId) {
      const nextSegment = getNextSegment(state.currentSegmentId);
      if (nextSegment) {
        const newStatuses = new Map(state.currentItemStatuses);
        newStatuses.set(state.currentSegmentId, 'completed');
        newStatuses.set(nextSegment.id, 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        displayedSecondsRef.current = duration;
        
        setState(prev => ({
          ...prev,
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses,
          lastUpdate: new Date().toISOString()
        }));
        
        if (onSaveState) {
          const stateToSave = {
            ...state,
            currentSegmentId: nextSegment.id,
            timeRemaining: duration,
            playbackStartTime: preciseStartTime,
            controllerId: userId,
            currentItemStatuses: newStatuses,
            lastUpdate: new Date().toISOString()
          };
          onSaveState(stateToSave);
        }
        
        if (state.isPlaying) {
          startUnifiedTimer();
        }
      }
    }
  }, [state, getNextSegment, timeToSeconds, userId, startUnifiedTimer, getPreciseTime, onSaveState]);

  const backward = useCallback(() => {
    if (state.currentSegmentId) {
      const prevSegment = getPreviousSegment(state.currentSegmentId);
      if (prevSegment) {
        const newStatuses = new Map(state.currentItemStatuses);
        newStatuses.set(state.currentSegmentId, 'upcoming');
        newStatuses.set(prevSegment.id, 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        displayedSecondsRef.current = duration;
        
        setState(prev => ({
          ...prev,
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses,
          lastUpdate: new Date().toISOString()
        }));
        
        if (onSaveState) {
          const stateToSave = {
            ...state,
            currentSegmentId: prevSegment.id,
            timeRemaining: duration,
            playbackStartTime: preciseStartTime,
            controllerId: userId,
            currentItemStatuses: newStatuses,
            lastUpdate: new Date().toISOString()
          };
          onSaveState(stateToSave);
        }
        
        if (state.isPlaying) {
          startUnifiedTimer();
        }
      }
    }
  }, [state, getPreviousSegment, timeToSeconds, userId, startUnifiedTimer, getPreciseTime, onSaveState]);

  const reset = useCallback(() => {
    if (state.currentSegmentId) {
      const currentSegment = items.find(item => item.id === state.currentSegmentId);
      if (currentSegment) {
        const duration = timeToSeconds(currentSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        displayedSecondsRef.current = duration;
        
        setState(prev => ({
          ...prev,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          lastUpdate: new Date().toISOString()
        }));
        
        if (onSaveState) {
          const stateToSave = {
            ...state,
            timeRemaining: duration,
            playbackStartTime: preciseStartTime,
            controllerId: userId,
            lastUpdate: new Date().toISOString()
          };
          onSaveState(stateToSave);
        }
        
        if (state.isPlaying) {
          startUnifiedTimer();
        }
      }
    }
  }, [state, items, timeToSeconds, userId, startUnifiedTimer, getPreciseTime, onSaveState]);

  const jumpToSegment = useCallback((segmentId: string) => {
    const targetSegment = items.find(item => item.id === segmentId);
    if (!targetSegment) return;
    
    const newStatuses = new Map();
    const selectedIndex = items.findIndex(item => item.id === segmentId);
    
    items.forEach((item, index) => {
      if (item.type === 'regular' && !isFloated(item)) {
        if (index < selectedIndex) {
          newStatuses.set(item.id, 'completed');
        } else if (index === selectedIndex) {
          newStatuses.set(item.id, 'current');
        }
      }
    });
    
    const duration = timeToSeconds(targetSegment.duration || '00:00');
    const preciseStartTime = getPreciseTime();
    
    displayedSecondsRef.current = duration;
    
    setState(prev => ({
      ...prev,
      currentSegmentId: segmentId,
      timeRemaining: duration,
      playbackStartTime: preciseStartTime,
      currentItemStatuses: newStatuses,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    }));
    
    if (onSaveState) {
      const stateToSave = {
        ...state,
        currentSegmentId: segmentId,
        timeRemaining: duration,
        playbackStartTime: preciseStartTime,
        currentItemStatuses: newStatuses,
        controllerId: userId,
        lastUpdate: new Date().toISOString()
      };
      onSaveState(stateToSave);
    }
  }, [items, timeToSeconds, getPreciseTime, userId, onSaveState, state]);

  // Apply external state
  const applyExternalState = useCallback((externalState: any) => {
    stopUnifiedTimer();
    
    const statusMap = new Map();
    if (externalState.currentItemStatuses) {
      if (externalState.currentItemStatuses instanceof Map) {
        externalState.currentItemStatuses.forEach((value, key) => {
          statusMap.set(key, value);
        });
      } else {
        Object.entries(externalState.currentItemStatuses).forEach(([id, status]) => {
          statusMap.set(id, status as string);
        });
      }
    }
    
    // Synchronize time if playing
    let synchronizedState = { ...externalState, currentItemStatuses: statusMap };
    
    if (externalState.isPlaying && externalState.playbackStartTime && externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        const segmentDurationMs = timeToMilliseconds(segment.duration || '00:00');
        const currentTime = getPreciseTime();
        const elapsedMs = currentTime - externalState.playbackStartTime;
        const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);
        const syncedTimeRemaining = Math.max(0, Math.floor(remainingMs / 1000));
        
        synchronizedState = {
          ...synchronizedState,
          timeRemaining: syncedTimeRemaining
        };
        
        displayedSecondsRef.current = syncedTimeRemaining;
      }
    }
    
    setState(prev => ({
      ...prev,
      ...synchronizedState,
      isController: synchronizedState.controllerId === userId,
      isInitialized: true
    }));
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startUnifiedTimer(), 50);
    }
  }, [stopUnifiedTimer, items, timeToMilliseconds, getPreciseTime, userId, startUnifiedTimer]);

  // Initialize default segment
  useEffect(() => {
    if (items.length > 0 && !state.currentSegmentId && !state.isInitialized) {
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        displayedSecondsRef.current = duration;
        
        setState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration,
          isInitialized: true
        }));
      }
    }
  }, [items, state.currentSegmentId, state.isInitialized, timeToSeconds]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      isAdvancingRef.current = false;
    };
  }, []);

  // Calculate current timing status
  const currentTimingStatus = useMemo(() => {
    const { timingStatus } = calculateUnifiedTiming();
    return timingStatus;
  }, [calculateUnifiedTiming]);

  return {
    state,
    timingStatus: currentTimingStatus,
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    applyExternalState,
    isPlaying: state.isPlaying,
    currentSegmentId: state.currentSegmentId,
    timeRemaining: state.timeRemaining,
    isController: state.isController,
    isInitialized: state.isInitialized,
    getItemStatus: useCallback((itemId: string) => {
      return state.currentItemStatuses.get(itemId) || 'upcoming';
    }, [state.currentItemStatuses])
  };
};
