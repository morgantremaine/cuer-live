
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';

export interface ConsolidatedShowcallerState {
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

interface UseShowcallerConsolidatedTimingProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
  onSaveState?: (state: any) => Promise<void>;
  onExternalStateReceived?: (state: any) => void;
}

export const useShowcallerConsolidatedTiming = ({
  items,
  rundownId,
  userId,
  onSaveState,
  onExternalStateReceived
}: UseShowcallerConsolidatedTimingProps) => {
  const [state, setState] = useState<ConsolidatedShowcallerState>({
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

  // Single consolidated timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<boolean>(false);
  const lastAdvancementTimeRef = useRef<number>(0);
  const isAdvancingRef = useRef<boolean>(false);

  // High-precision time utilities
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

  // Navigation helpers - skip floated items
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

  // Consolidated state update function
  const updateState = useCallback((updates: Partial<ConsolidatedShowcallerState>, shouldSave: boolean = false) => {
    setState(prev => {
      const newState = {
        ...prev,
        ...updates,
        lastUpdate: new Date().toISOString(),
        isController: (updates.controllerId || prev.controllerId) === userId
      };

      console.log('📺 Consolidated timing state update:', {
        updates: Object.keys(updates),
        isController: newState.isController,
        timeRemaining: newState.timeRemaining,
        isPlaying: newState.isPlaying
      });

      if (shouldSave && onSaveState) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          onSaveState(newState);
        }, 100); // Quick save for critical updates
      }

      return newState;
    });
  }, [userId, onSaveState]);

  // Single consolidated precision timer
  const startConsolidatedTimer = useCallback(() => {
    console.log('📺 Starting consolidated precision timer');
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const updateTimer = () => {
      setState(prevState => {
        // Safety checks
        if (!prevState.currentSegmentId || !prevState.isPlaying || !prevState.playbackStartTime) {
          return prevState;
        }

        // Calculate precise time remaining
        const currentTime = getPreciseTime();
        const elapsedMs = currentTime - prevState.playbackStartTime;
        
        const currentSegment = items.find(item => item.id === prevState.currentSegmentId);
        if (!currentSegment) return prevState;
        
        const segmentDurationMs = timeToMilliseconds(currentSegment.duration || '00:00');
        const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

        console.log('📺 Timer update:', {
          segment: currentSegment.name,
          elapsedMs: Math.round(elapsedMs),
          remainingMs: Math.round(remainingMs),
          remainingSeconds
        });

        // Check for segment advancement
        if (remainingMs <= 0) {
          // Rate limiting
          if (currentTime - lastAdvancementTimeRef.current < 1500) {
            console.log('📺 Rate limiting advancement');
            return { ...prevState, timeRemaining: 0 };
          }

          if (isAdvancingRef.current) {
            console.log('📺 Already advancing, skipping');
            return prevState;
          }

          if (prevState.isController) {
            isAdvancingRef.current = true;
            lastAdvancementTimeRef.current = currentTime;

            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              console.log('📺 Advancing to next segment:', nextSegment.name);
              
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
              
              // Save immediately for segment transitions
              if (onSaveState) {
                onSaveState(newState);
              }
              
              // Reset advancement flag and continue timer
              setTimeout(() => {
                isAdvancingRef.current = false;
                if (newState.isPlaying) {
                  timerRef.current = setTimeout(updateTimer, 100);
                }
              }, 100);
              
              return newState;
            } else {
              console.log('📺 No more segments, stopping playback');
              
              const newState = {
                ...prevState,
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0,
                playbackStartTime: null,
                controllerId: null,
                lastUpdate: new Date().toISOString()
              };
              
              if (onSaveState) {
                onSaveState(newState);
              }
              
              isAdvancingRef.current = false;
              return newState;
            }
          }
        }
        
        const newState = {
          ...prevState,
          timeRemaining: remainingSeconds,
          lastUpdate: new Date().toISOString()
        };
        
        // Periodic save every 30 seconds to reduce database load
        if (prevState.isController && remainingSeconds > 0 && remainingSeconds % 30 === 0) {
          if (onSaveState) {
            setTimeout(() => onSaveState(newState), 50);
          }
        }
        
        return newState;
      });

      // Schedule next update
      timerRef.current = setTimeout(updateTimer, 100);
    };

    // Start the timer loop
    updateTimer();
  }, [items, getPreciseTime, timeToMilliseconds, timeToSeconds, getNextSegment, onSaveState]);

  const stopConsolidatedTimer = useCallback(() => {
    console.log('📺 Stopping consolidated timer');
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isAdvancingRef.current = false;
  }, []);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Consolidated play called:', { selectedSegmentId, userId });
    
    const preciseStartTime = getPreciseTime();
    const newStatuses = new Map();
    
    if (selectedSegmentId) {
      // Mark segments appropriately
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
      
      // IMMEDIATE state update with precise timing - fixes the race condition
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
      
      // Save state and start timer immediately
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
      // Find first non-floated segment
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        newStatuses.set(firstSegment.id, 'current');
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        
        // IMMEDIATE state update
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
      // Resume current segment - IMMEDIATE state update
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
    
    // Start timer immediately after state update
    setTimeout(() => startConsolidatedTimer(), 10);
  }, [items, state.currentSegmentId, userId, timeToSeconds, startConsolidatedTimer, getPreciseTime, onSaveState]);

  const pause = useCallback(() => {
    console.log('📺 Consolidated pause called');
    
    stopConsolidatedTimer();
    updateState({
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true);
  }, [stopConsolidatedTimer, updateState, userId]);

  const forward = useCallback(() => {
    console.log('📺 Consolidated forward called');
    
    if (state.currentSegmentId) {
      const nextSegment = getNextSegment(state.currentSegmentId);
      if (nextSegment) {
        const newStatuses = new Map(state.currentItemStatuses);
        newStatuses.set(state.currentSegmentId, 'completed');
        newStatuses.set(nextSegment.id, 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        updateState({
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true);
        
        if (state.isPlaying) {
          startConsolidatedTimer();
        }
      }
    }
  }, [state, getNextSegment, timeToSeconds, userId, updateState, startConsolidatedTimer, getPreciseTime]);

  const backward = useCallback(() => {
    console.log('📺 Consolidated backward called');
    
    if (state.currentSegmentId) {
      const prevSegment = getPreviousSegment(state.currentSegmentId);
      if (prevSegment) {
        const newStatuses = new Map(state.currentItemStatuses);
        newStatuses.set(state.currentSegmentId, 'upcoming');
        newStatuses.set(prevSegment.id, 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        updateState({
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true);
        
        if (state.isPlaying) {
          startConsolidatedTimer();
        }
      }
    }
  }, [state, getPreviousSegment, timeToSeconds, userId, updateState, startConsolidatedTimer, getPreciseTime]);

  const reset = useCallback(() => {
    console.log('📺 Consolidated reset called');
    
    if (state.currentSegmentId) {
      const currentSegment = items.find(item => item.id === state.currentSegmentId);
      if (currentSegment) {
        const duration = timeToSeconds(currentSegment.duration || '00:00');
        const preciseStartTime = state.isPlaying ? getPreciseTime() : null;
        
        updateState({
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId
        }, true);
        
        if (state.isPlaying) {
          startConsolidatedTimer();
        }
      }
    }
  }, [state, items, timeToSeconds, userId, updateState, startConsolidatedTimer, getPreciseTime]);

  const jumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Consolidated jumpToSegment called:', segmentId);
    
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
    
    updateState({
      currentSegmentId: segmentId,
      timeRemaining: duration,
      playbackStartTime: preciseStartTime,
      currentItemStatuses: newStatuses,
      controllerId: userId
    }, true);
  }, [items, timeToSeconds, getPreciseTime, userId, updateState]);

  // Apply external state with proper synchronization
  const applyExternalState = useCallback((externalState: any) => {
    console.log('📺 Applying external consolidated state:', externalState);
    
    stopConsolidatedTimer();
    
    // Convert statusMap if needed
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
        const syncedTimeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
        
        synchronizedState = {
          ...synchronizedState,
          timeRemaining: syncedTimeRemaining
        };
        
        console.log('📺 Synchronized external timing:', {
          elapsedMs: Math.round(elapsedMs),
          remainingMs: Math.round(remainingMs),
          syncedTimeRemaining
        });
      }
    }
    
    setState(prev => ({
      ...prev,
      ...synchronizedState,
      isController: synchronizedState.controllerId === userId,
      isInitialized: true
    }));
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startConsolidatedTimer(), 50);
    }
  }, [stopConsolidatedTimer, items, timeToMilliseconds, getPreciseTime, userId, startConsolidatedTimer]);

  // Initialize default segment
  useEffect(() => {
    if (!initializationRef.current && items.length > 0 && !state.currentSegmentId) {
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        console.log('📺 Initializing with first segment:', firstSegment.name);
        
        setState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration,
          isInitialized: true
        }));
        
        initializationRef.current = true;
      }
    }
  }, [items, state.currentSegmentId, timeToSeconds]);

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

  return {
    state,
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
