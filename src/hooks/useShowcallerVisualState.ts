
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';
import { useShowcallerInitialState } from './useShowcallerInitialState';
import { useShowcallerPrecisionTiming } from './useShowcallerPrecisionTiming';

export interface ShowcallerVisualState {
  currentItemStatuses: Map<string, string>; // item id -> status
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

interface UseShowcallerVisualStateProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
  disableAutoSave?: boolean; // Add flag to disable auto-save when used with simple sync
}

export const useShowcallerVisualState = ({
  items,
  rundownId,
  userId,
  disableAutoSave = false
}: UseShowcallerVisualStateProps) => {
  const [visualState, setVisualState] = useState<ShowcallerVisualState>({
    currentItemStatuses: new Map(),
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString(),
    controllerId: null
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const lastAdvancementTimeRef = useRef<number>(0);
  const isAdvancingRef = useRef<boolean>(false);
  const precisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suppressPersistence = useRef<boolean>(false);

  // Use precision timing utility
  const {
    timeToMilliseconds,
    getPreciseTime,
    calculatePreciseTimeRemaining,
    calculatePrecisePlaybackStart,
    resetDriftCompensation,
    synchronizeWithExternalState
  } = useShowcallerPrecisionTiming({ items });

  // Legacy time conversion for compatibility
  const timeToSeconds = useCallback((timeStr: string) => {
    return Math.round(timeToMilliseconds(timeStr) / 1000);
  }, [timeToMilliseconds]);

  // Track our own updates to prevent feedback loops
  const trackOwnUpdate = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 10000);
  }, []);

  // Handle initial state loading with precision timing
  const handleInitialStateLoaded = useCallback((loadedState: any) => {
    console.log('📺 Applying loaded initial state with precision timing');
    
    // Suppress persistence during restoration
    suppressPersistence.current = true;
    
    // Convert plain object back to Map for statuses
    const statusMap = new Map();
    if (loadedState.currentItemStatuses) {
      Object.entries(loadedState.currentItemStatuses).forEach(([id, status]) => {
        statusMap.set(id, status as string);
      });
    }

    // Use precision timing for synchronization
    const synchronizedState = synchronizeWithExternalState({
      ...loadedState,
      currentItemStatuses: statusMap
    });

    setVisualState(synchronizedState);
    setIsInitialized(true);

    // If it was playing when saved, restart the precision timer
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting precision timer from saved state');
      setTimeout(() => startPrecisionTimer(), 50);
    }
    
    // Re-enable persistence after restoration is complete
    setTimeout(() => {
      suppressPersistence.current = false;
      console.log('📺 Persistence re-enabled after initial restoration');
    }, 200);
  }, [synchronizeWithExternalState]);

  // Initialize state loading
  const { hasLoaded } = useShowcallerInitialState({
    rundownId,
    onStateLoaded: handleInitialStateLoaded,
    trackOwnUpdate
  });

  // Mark as initialized when either state loads or no state exists
  useEffect(() => {
    if (rundownId && !isInitialized) {
      // If no saved state exists after loading attempt, still mark as initialized
      const initTimer = setTimeout(() => {
        if (!isInitialized) {
          console.log('📺 No saved state found, initializing with default state');
          setIsInitialized(true);
        }
      }, 2000);

      return () => clearTimeout(initTimer);
    }
  }, [rundownId, hasLoaded, isInitialized]);

  // Save showcaller visual state to database with enhanced debouncing
  const saveShowcallerVisualState = useCallback(async (state: ShowcallerVisualState) => {
    if (!rundownId) return;

    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Track this update as our own before saving
      trackOwnUpdate(state.lastUpdate);
      
      // Convert Map to plain object for storage
      const stateToSave = {
        ...state,
        currentItemStatuses: Object.fromEntries(state.currentItemStatuses)
      };

      // CRITICAL FIX: Don't manually set updated_at to prevent realtime feedback loops
      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: stateToSave
        })
        .eq('id', rundownId);

      if (error) {
        console.error('❌ Failed to save showcaller visual state:', error);
      } else {
        console.log('📺 Successfully saved showcaller visual state');
      }
    } catch (error) {
      console.error('❌ Error saving showcaller visual state:', error);
    }
  }, [rundownId, trackOwnUpdate]);

  // Enhanced debounced save with longer delay and critical change detection
  const debouncedSaveVisualState = useCallback((state: ShowcallerVisualState, isCritical: boolean = false) => {
    // Skip save if persistence is suppressed or auto-save is disabled
    if (suppressPersistence.current || disableAutoSave) {
      if (disableAutoSave) {
        console.log('📺 Save skipped - auto-save disabled (using simple sync)');
      } else {
        console.log('📺 Save suppressed during restoration/self-healing');
      }
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Use shorter delay for critical changes (segment transitions), longer for routine updates
    const delay = isCritical ? 50 : 2000;

    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerVisualState(state);
    }, delay);
  }, [saveShowcallerVisualState, disableAutoSave]);

  // Update visual state without touching main rundown state
  const updateVisualState = useCallback((updates: Partial<ShowcallerVisualState>, shouldSync: boolean = false, isCritical: boolean = false) => {
    setVisualState(prev => {
      const newState = {
        ...prev,
        ...updates,
        lastUpdate: new Date().toISOString()
      };

      if (shouldSync) {
        debouncedSaveVisualState(newState, isCritical);
      }

      return newState;
    });
  }, [debouncedSaveVisualState]);

  // Navigation helpers - now skip floated items
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

  // Enhanced jump to segment function with precision timing
  const jumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Visual jumpToSegment called with segmentId:', segmentId);
    
    const targetSegment = items.find(item => item.id === segmentId);
    if (!targetSegment) {
      console.error('📺 Target segment not found for jump:', segmentId);
      return;
    }
    
    const newStatuses = new Map();
    
    // Mark segments before selected as completed, after as upcoming (skip floated items)
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
    
    updateVisualState({
      currentSegmentId: segmentId,
      timeRemaining: duration,
      playbackStartTime: preciseStartTime,
      currentItemStatuses: newStatuses,
      controllerId: userId
    }, true, true);
    
    console.log('📺 Visual jumpToSegment completed with precision timing');
  }, [items, timeToSeconds, getPreciseTime, userId, updateVisualState]);

  // High-precision timer management
  const startPrecisionTimer = useCallback(() => {
    // Stop any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (precisionTimerRef.current) {
      clearTimeout(precisionTimerRef.current);
    }

    // Safety check - don't start timer if no current segment
    if (!visualState.currentSegmentId) {
      console.warn('📺 Cannot start precision timer - no current segment');
      return;
    }

    const isController = visualState.controllerId === userId;
    
    const updatePrecisionTimer = () => {
      setVisualState(prevState => {
        // Safety checks before processing timer tick
        if (!prevState.currentSegmentId || !prevState.isPlaying || !prevState.playbackStartTime) {
          return prevState;
        }

        // Calculate precise time remaining
        const preciseRemainingMs = calculatePreciseTimeRemaining(
          prevState.currentSegmentId,
          prevState.playbackStartTime,
          prevState.isPlaying
        );

        const remainingSeconds = Math.max(0, Math.floor(preciseRemainingMs / 1000));

        // CRITICAL FIX: Only advance when we have truly reached 0 milliseconds remaining (with small buffer)
        if (preciseRemainingMs <= 50) { // 50ms buffer to prevent premature advancement
          // Rate limiting: prevent rapid advancement
          const now = getPreciseTime();
          if (now - lastAdvancementTimeRef.current < 1500) {
            console.log('📺 Rate limiting: skipping advancement too soon');
            return { ...prevState, timeRemaining: 0 };
          }

          // Prevent concurrent advancement
          if (isAdvancingRef.current) {
            console.log('📺 Already advancing, skipping');
            return prevState;
          }

          // Only the controller can advance segments - non-controllers just stop
          if (isController) {
            isAdvancingRef.current = true;
            lastAdvancementTimeRef.current = now;

            // Move to next segment with precision timing
            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration || '00:00');
              const newStatuses = new Map(prevState.currentItemStatuses);
              newStatuses.set(prevState.currentSegmentId, 'completed');
              newStatuses.set(nextSegment.id, 'current');
              
              // Calculate precise playback start time for next segment
              const preciseStartTime = calculatePrecisePlaybackStart(
                prevState.currentSegmentId,
                prevState.playbackStartTime,
                now
              );
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: preciseStartTime,
                currentItemStatuses: newStatuses,
                lastUpdate: new Date().toISOString()
              };
              
              // Save immediately for segment transitions (critical change)
              debouncedSaveVisualState(newState, true);
              
              // Reset advancement flag and restart precision timer
              setTimeout(() => {
                isAdvancingRef.current = false;
                if (newState.isPlaying) {
                  startPrecisionTimer();
                }
              }, 100);
              
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
              
              debouncedSaveVisualState(newState, true);
              isAdvancingRef.current = false;
              resetDriftCompensation();
              return newState;
            }
          } else {
            // Non-controllers just show time as 0 but don't advance
            return {
              ...prevState,
              timeRemaining: 0
            };
          }
        }
        
        const newState = {
          ...prevState,
          timeRemaining: remainingSeconds,
          lastUpdate: new Date().toISOString()
        };
        
        // Controllers save state periodically, non-controllers just update UI
        if (isController && remainingSeconds > 0 && remainingSeconds % 60 === 0) {
          debouncedSaveVisualState(newState, false);
        }
        
        return newState;
      });

      // Schedule next precise update - aim for 100ms precision for all users
      precisionTimerRef.current = setTimeout(updatePrecisionTimer, 100);
    };

    // Start the precision timer loop
    updatePrecisionTimer();
  }, [
    visualState.controllerId, 
    visualState.currentSegmentId, 
    userId,
    getNextSegment, 
    timeToSeconds, 
    debouncedSaveVisualState,
    calculatePreciseTimeRemaining,
    calculatePrecisePlaybackStart,
    resetDriftCompensation,
    getPreciseTime
  ]);

  const stopPrecisionTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (precisionTimerRef.current) {
      clearTimeout(precisionTimerRef.current);
      precisionTimerRef.current = null;
    }
    // Reset advancement flags
    isAdvancingRef.current = false;
  }, []);

  // Enhanced control functions with precision timing
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Visual play called with segmentId:', selectedSegmentId);
    
    const newStatuses = new Map();
    const preciseStartTime = getPreciseTime();
    
    if (selectedSegmentId) {
      // Mark segments before selected as completed, after as upcoming (skip floated items)
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
      
      updateVisualState({
        isPlaying: true,
        currentSegmentId: selectedSegmentId,
        timeRemaining: duration,
        playbackStartTime: preciseStartTime,
        controllerId: userId,
        currentItemStatuses: newStatuses
      }, true, true);
    } else if (!visualState.currentSegmentId) {
      // Find first non-floated regular item
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        newStatuses.set(firstSegment.id, 'current');
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        
        updateVisualState({
          isPlaying: true,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true);
      }
    } else {
      // Resume current segment with updated start time
      updateVisualState({
        isPlaying: true,
        playbackStartTime: preciseStartTime,
        controllerId: userId
      }, true, true);
    }
    
    resetDriftCompensation(); // Reset drift tracking on new play
    startPrecisionTimer();
  }, [items, visualState.currentSegmentId, userId, timeToSeconds, updateVisualState, startPrecisionTimer, resetDriftCompensation, getPreciseTime]);

  const pause = useCallback(() => {
    console.log('📺 Visual pause called');
    
    stopPrecisionTimer();
    updateVisualState({
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true, true);
  }, [stopPrecisionTimer, updateVisualState, userId]);

  const forward = useCallback(() => {
    console.log('📺 Visual forward called');
    
    if (visualState.currentSegmentId) {
      const nextSegment = getNextSegment(visualState.currentSegmentId);
      if (nextSegment) {
        const newStatuses = new Map(visualState.currentItemStatuses);
        newStatuses.set(visualState.currentSegmentId, 'completed');
        newStatuses.set(nextSegment.id, 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        const preciseStartTime = visualState.isPlaying ? getPreciseTime() : null;
        
        updateVisualState({
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true);
        
        if (visualState.isPlaying) {
          resetDriftCompensation();
          startPrecisionTimer();
        }
      }
    }
  }, [visualState, getNextSegment, timeToSeconds, userId, updateVisualState, startPrecisionTimer, resetDriftCompensation, getPreciseTime]);

  const backward = useCallback(() => {
    console.log('📺 Visual backward called');
    
    if (visualState.currentSegmentId) {
      const prevSegment = getPreviousSegment(visualState.currentSegmentId);
      if (prevSegment) {
        const newStatuses = new Map(visualState.currentItemStatuses);
        newStatuses.set(visualState.currentSegmentId, 'upcoming');
        newStatuses.set(prevSegment.id, 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        const preciseStartTime = visualState.isPlaying ? getPreciseTime() : null;
        
        updateVisualState({
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true);
        
        if (visualState.isPlaying) {
          resetDriftCompensation();
          startPrecisionTimer();
        }
      }
    }
  }, [visualState, getPreviousSegment, timeToSeconds, userId, updateVisualState, startPrecisionTimer, resetDriftCompensation, getPreciseTime]);

  // Reset function with precision timing
  const reset = useCallback(() => {
    console.log('📺 Visual reset called');
    
    if (visualState.currentSegmentId) {
      const currentSegment = items.find(item => item.id === visualState.currentSegmentId);
      if (currentSegment) {
        const duration = timeToSeconds(currentSegment.duration || '00:00');
        const preciseStartTime = visualState.isPlaying ? getPreciseTime() : null;
        
        updateVisualState({
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          controllerId: userId
        }, true, false);
        
        if (visualState.isPlaying) {
          resetDriftCompensation();
          startPrecisionTimer();
        }
      }
    }
  }, [visualState, items, timeToSeconds, userId, updateVisualState, startPrecisionTimer, resetDriftCompensation, getPreciseTime]);

  // Enhanced apply external visual state with precision synchronization
  const applyExternalVisualState = useCallback((externalState: any, isTiming: boolean = false) => {
    // Skip if this is our own update
    if (ownUpdateTrackingRef.current.has(externalState.lastUpdate)) {
      console.log('⏭️ Skipping own showcaller update');
      return;
    }

    // Skip duplicate updates
    if (externalState.lastUpdate === lastProcessedUpdateRef.current) {
      console.log('⏭️ Skipping duplicate showcaller update');
      return;
    }

    lastProcessedUpdateRef.current = externalState.lastUpdate;
    
    console.log('📺 Applying external visual state from controller:', externalState.controllerId);
    
    // For timing updates, don't stop the precision timer - just sync smoothly
    if (isTiming && visualState.isPlaying) {
      console.log('📺 Smooth timing sync - adjusting playback start time');
      setVisualState(prev => ({
        ...prev,
        playbackStartTime: externalState.playbackStartTime,
        controllerId: externalState.controllerId,
        lastUpdate: externalState.lastUpdate
      }));
      return;
    }
    
    stopPrecisionTimer();
    
    // Convert plain object back to Map
    const statusMap = new Map();
    if (externalState.currentItemStatuses) {
      Object.entries(externalState.currentItemStatuses).forEach(([id, status]) => {
        statusMap.set(id, status as string);
      });
    }
    
    // Use precision timing synchronization
    const synchronizedState = synchronizeWithExternalState({
      ...externalState,
      currentItemStatuses: statusMap
    });
    
    setVisualState(synchronizedState);
    
    // Start precision timer for all users when playing, not just controllers
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startPrecisionTimer(), 50);
    }
  }, [stopPrecisionTimer, synchronizeWithExternalState, startPrecisionTimer, visualState.isPlaying]);

  // Initialize current segment - skip floated items, but only after state is loaded
  useEffect(() => {
    if (isInitialized && !visualState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        setVisualState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
      }
    }
  }, [isInitialized, items.length, visualState.currentSegmentId, timeToSeconds]);

  // Self-healing mechanism: Handle segment deletion/invalidation with throttling
  const lastSelfHealingRef = useRef<number>(0);
  const selfHealingThrottleMs = 3000; // Only self-heal once every 3 seconds
  
  useEffect(() => {
    if (!isInitialized || !visualState.currentSegmentId) return;

    const now = Date.now();
    if (now - lastSelfHealingRef.current < selfHealingThrottleMs) {
      return; // Throttle self-healing to prevent loops
    }

    // Check if current segment still exists and is valid (non-floated regular item)
    const currentSegment = items.find(item => item.id === visualState.currentSegmentId);
    const isCurrentSegmentValid = currentSegment && 
                                  currentSegment.type === 'regular' && 
                                  !isFloated(currentSegment);

    if (!isCurrentSegmentValid) {
      console.log('🔧 Self-healing: Current segment invalid or deleted, finding fallback');
      lastSelfHealingRef.current = now; // Mark that we're performing self-healing
      
      // Only proceed if this client is the controller or there's no active controller
      const isController = visualState.controllerId === userId;
      if (!isController && visualState.controllerId) {
        console.log('🔧 Self-healing: Not controller, skipping auto-healing');
        return;
      }
      
      // Find fallback segment: prefer next available, then previous, then clear
      let fallbackSegment = null;
      const wasPlaying = visualState.isPlaying;
      
      if (currentSegment) {
        // Try to find next segment from current position
        fallbackSegment = getNextSegment(visualState.currentSegmentId);
        
        // If no next segment, try previous
        if (!fallbackSegment) {
          fallbackSegment = getPreviousSegment(visualState.currentSegmentId);
        }
      }
      
      // If still no fallback, find first available segment
      if (!fallbackSegment) {
        fallbackSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      }
      
      if (fallbackSegment) {
        console.log('🔧 Self-healing: Moving to fallback segment:', fallbackSegment.id);
        
        // Suppress persistence during self-healing
        suppressPersistence.current = true;
        
        // Rebuild status map for the new current segment
        const newStatuses = new Map();
        const fallbackIndex = items.findIndex(item => item.id === fallbackSegment.id);
        
        items.forEach((item, index) => {
          if (item.type === 'regular' && !isFloated(item)) {
            if (index < fallbackIndex) {
              newStatuses.set(item.id, 'completed');
            } else if (index === fallbackIndex) {
              newStatuses.set(item.id, 'current');
            }
            // Items after fallback remain as 'upcoming' (no status set)
          }
        });
        
        const duration = timeToSeconds(fallbackSegment.duration || '00:00');
        const preciseStartTime = wasPlaying ? getPreciseTime() : null;
        
        updateVisualState({
          currentSegmentId: fallbackSegment.id,
          timeRemaining: duration,
          playbackStartTime: preciseStartTime,
          currentItemStatuses: newStatuses,
          isPlaying: wasPlaying,
          controllerId: userId
        }, false, false); // Don't save during self-healing
        
        // Re-enable persistence after self-healing
        setTimeout(() => {
          suppressPersistence.current = false;
          console.log('📺 Persistence re-enabled after self-healing');
        }, 100);
        
        // Restart timer if was playing
        if (wasPlaying) {
          resetDriftCompensation();
          startPrecisionTimer();
        }
      } else {
        console.log('🔧 Self-healing: No valid segments found, clearing state');
        
        // Suppress persistence during self-healing
        suppressPersistence.current = true;
        
        // No valid segments exist, clear the showcaller state
        updateVisualState({
          currentSegmentId: null,
          timeRemaining: 0,
          playbackStartTime: null,
          currentItemStatuses: new Map(),
          isPlaying: false,
          controllerId: null
        }, false, false); // Don't save during self-healing
        
        // Re-enable persistence after self-healing
        setTimeout(() => {
          suppressPersistence.current = false;
          console.log('📺 Persistence re-enabled after self-healing');
        }, 100);
        
        stopPrecisionTimer();
        resetDriftCompensation();
      }
    } else {
      // Current segment is valid, but check if status map needs cleaning (also throttled)
      const newStatuses = new Map();
      let statusMapChanged = false;
      
      // Remove statuses for deleted/invalid items
      visualState.currentItemStatuses.forEach((status, itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item && item.type === 'regular' && !isFloated(item)) {
          newStatuses.set(itemId, status);
        } else {
          statusMapChanged = true;
          console.log('🔧 Self-healing: Removing status for deleted/invalid item:', itemId);
        }
      });
      
      // Update status map if any invalid items were removed (throttled)
      if (statusMapChanged && (now - lastSelfHealingRef.current) >= selfHealingThrottleMs) {
        lastSelfHealingRef.current = now;
        
        // Suppress persistence during self-healing cleanup
        suppressPersistence.current = true;
        
        updateVisualState({
          currentItemStatuses: newStatuses
        }, false, false); // Don't save during self-healing
        
        // Re-enable persistence after cleanup
        setTimeout(() => {
          suppressPersistence.current = false;
          console.log('📺 Persistence re-enabled after status cleanup');
        }, 100);
      }
    }
  }, [
    isInitialized, 
    items, 
    visualState.currentSegmentId, 
    visualState.controllerId, 
    visualState.isPlaying,
    visualState.currentItemStatuses,
    userId, 
    getNextSegment, 
    getPreviousSegment, 
    timeToSeconds, 
    getPreciseTime,
    updateVisualState,
    startPrecisionTimer,
    stopPrecisionTimer,
    resetDriftCompensation
  ]);


  // Enhanced cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (precisionTimerRef.current) {
        clearTimeout(precisionTimerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Reset all refs
      isAdvancingRef.current = false;
      lastAdvancementTimeRef.current = 0;
    };
  }, []);

  return {
    visualState,
    getItemVisualStatus: useCallback((itemId: string) => {
      return visualState.currentItemStatuses.get(itemId) || 'upcoming';
    }, [visualState.currentItemStatuses]),
    setItemVisualStatus: useCallback((itemId: string, status: string) => {
      setVisualState(prev => {
        const newStatuses = new Map(prev.currentItemStatuses);
        if (status === 'upcoming' || status === '') {
          newStatuses.delete(itemId);
        } else {
          newStatuses.set(itemId, status);
        }
        
        return {
          ...prev,
          currentItemStatuses: newStatuses,
          lastUpdate: new Date().toISOString()
        };
      });
    }, []),
    clearAllVisualStatuses: useCallback(() => {
      setVisualState(prev => ({
        ...prev,
        currentItemStatuses: new Map(),
        lastUpdate: new Date().toISOString()
      }));
    }, []),
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    applyExternalVisualState,
    isPlaying: visualState.isPlaying,
    currentSegmentId: visualState.currentSegmentId,
    timeRemaining: visualState.timeRemaining,
    isController: visualState.controllerId === userId,
    trackOwnUpdate,
    isInitialized,
    getPreciseTime // Export getPreciseTime for coordination layer
  };
};
