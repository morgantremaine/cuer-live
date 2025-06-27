
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';
import { useShowcallerInitialState } from './useShowcallerInitialState';
import { useShowcallerTimingSync } from './useShowcallerTimingSync';

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
}

export const useShowcallerVisualState = ({
  items,
  rundownId,
  userId
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

  // Use timing synchronization utility
  const { calculateSynchronizedTimeRemaining, timeToSeconds } = useShowcallerTimingSync({ items });

  // Track our own updates to prevent feedback loops
  const trackOwnUpdate = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 10000);
  }, []);

  // Handle initial state loading
  const handleInitialStateLoaded = useCallback((loadedState: any) => {
    console.log('📺 Applying loaded initial state');
    
    // Convert plain object back to Map for statuses
    const statusMap = new Map();
    if (loadedState.currentItemStatuses) {
      Object.entries(loadedState.currentItemStatuses).forEach(([id, status]) => {
        statusMap.set(id, status as string);
      });
    }

    // Calculate synchronized timing for ongoing playback
    const synchronizedState = calculateSynchronizedTimeRemaining({
      ...loadedState,
      currentItemStatuses: statusMap
    });

    setVisualState(synchronizedState);
    setIsInitialized(true);

    // If it was playing when saved, restart the timer
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting timer from saved state');
      setTimeout(() => startTimer(), 100);
    }
  }, [calculateSynchronizedTimeRemaining]);

  // Initialize state loading
  const { hasLoaded } = useShowcallerInitialState({
    rundownId,
    onStateLoaded: handleInitialStateLoaded,
    trackOwnUpdate
  });

  // Mark as initialized when either state loads or no state exists
  useEffect(() => {
    if (rundownId && !isInitialized && hasLoaded) {
      setIsInitialized(true);
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

      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: stateToSave,
          updated_at: new Date().toISOString()
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
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Use shorter delay for critical changes (segment transitions), longer for routine updates
    const delay = isCritical ? 100 : 1000;

    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerVisualState(state);
    }, delay);
  }, [saveShowcallerVisualState]);

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

  // Set item status in visual state only
  const setItemVisualStatus = useCallback((itemId: string, status: string) => {
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
  }, []);

  // Clear all visual statuses
  const clearAllVisualStatuses = useCallback(() => {
    setVisualState(prev => ({
      ...prev,
      currentItemStatuses: new Map(),
      lastUpdate: new Date().toISOString()
    }));
  }, []);

  // Get visual status for an item
  const getItemVisualStatus = useCallback((itemId: string) => {
    return visualState.currentItemStatuses.get(itemId) || 'upcoming';
  }, [visualState.currentItemStatuses]);

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

  // Enhanced jump to segment function
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
    
    updateVisualState({
      currentSegmentId: segmentId,
      timeRemaining: duration,
      currentItemStatuses: newStatuses,
      controllerId: userId
    }, true, true); // Mark as critical change
    
    console.log('📺 Visual jumpToSegment completed - staying in current playback state');
  }, [items, timeToSeconds, userId, updateVisualState]);

  // Enhanced timer management with safety checks
  const startTimer = useCallback(() => {
    // Stop any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Safety check - don't start timer if no current segment
    if (!visualState.currentSegmentId) {
      console.warn('📺 Cannot start timer - no current segment');
      return;
    }

    const isController = visualState.controllerId === userId;
    
    timerRef.current = setInterval(() => {
      setVisualState(prevState => {
        // Safety checks before processing timer tick
        if (!prevState.currentSegmentId || !prevState.isPlaying) {
          return prevState;
        }

        // CRITICAL FIX: Change condition from <= 1 to <= 0 to prevent premature advancement
        if (prevState.timeRemaining <= 0) {
          // Rate limiting: prevent rapid advancement
          const now = Date.now();
          if (now - lastAdvancementTimeRef.current < 2000) {
            console.log('📺 Rate limiting: skipping advancement too soon');
            return { ...prevState, timeRemaining: 0 };
          }

          // Prevent concurrent advancement
          if (isAdvancingRef.current) {
            console.log('📺 Already advancing, skipping');
            return prevState;
          }

          if (isController) {
            isAdvancingRef.current = true;
            lastAdvancementTimeRef.current = now;

            // Move to next segment (skipping floated items)
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
                playbackStartTime: Date.now(),
                currentItemStatuses: newStatuses,
                lastUpdate: new Date().toISOString()
              };
              
              // Save immediately for segment transitions (critical change)
              debouncedSaveVisualState(newState, true);
              
              // Reset advancement flag after a delay
              setTimeout(() => {
                isAdvancingRef.current = false;
              }, 1000);
              
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
        
        const newState = {
          ...prevState,
          timeRemaining: Math.max(0, prevState.timeRemaining - 1),
          lastUpdate: new Date().toISOString()
        };
        
        // Reduced sync frequency: only save every 60 seconds to reduce database load
        if (isController && prevState.timeRemaining % 60 === 0) {
          debouncedSaveVisualState(newState, false);
        }
        
        return newState;
      });
    }, 1000);
  }, [visualState.controllerId, visualState.currentSegmentId, userId, getNextSegment, timeToSeconds, debouncedSaveVisualState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Reset advancement flags
    isAdvancingRef.current = false;
  }, []);

  // Enhanced control functions that only affect visual state
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Visual play called with segmentId:', selectedSegmentId);
    
    const newStatuses = new Map();
    
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
        playbackStartTime: Date.now(),
        controllerId: userId,
        currentItemStatuses: newStatuses
      }, true, true); // Critical change
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
          playbackStartTime: Date.now(),
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true); // Critical change
      }
    } else {
      // Resume current segment
      updateVisualState({
        isPlaying: true,
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true, true); // Critical change
    }
    
    startTimer();
  }, [items, visualState.currentSegmentId, userId, timeToSeconds, updateVisualState, startTimer]);

  const pause = useCallback(() => {
    console.log('📺 Visual pause called');
    
    stopTimer();
    updateVisualState({
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId
    }, true, true); // Critical change
  }, [stopTimer, updateVisualState, userId]);

  const forward = useCallback(() => {
    console.log('📺 Visual forward called');
    
    if (visualState.currentSegmentId) {
      const nextSegment = getNextSegment(visualState.currentSegmentId);
      if (nextSegment) {
        const newStatuses = new Map(visualState.currentItemStatuses);
        newStatuses.set(visualState.currentSegmentId, 'completed');
        newStatuses.set(nextSegment.id, 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        
        updateVisualState({
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: visualState.isPlaying ? Date.now() : null,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true); // Critical change
        
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, getNextSegment, timeToSeconds, userId, updateVisualState, startTimer]);

  const backward = useCallback(() => {
    console.log('📺 Visual backward called');
    
    if (visualState.currentSegmentId) {
      const prevSegment = getPreviousSegment(visualState.currentSegmentId);
      if (prevSegment) {
        const newStatuses = new Map(visualState.currentItemStatuses);
        newStatuses.set(visualState.currentSegmentId, 'upcoming');
        newStatuses.set(prevSegment.id, 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        
        updateVisualState({
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: visualState.isPlaying ? Date.now() : null,
          controllerId: userId,
          currentItemStatuses: newStatuses
        }, true, true); // Critical change
        
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, getPreviousSegment, timeToSeconds, userId, updateVisualState, startTimer]);

  // Reset function - resets timer to full duration of current segment
  const reset = useCallback(() => {
    console.log('📺 Visual reset called');
    
    if (visualState.currentSegmentId) {
      const currentSegment = items.find(item => item.id === visualState.currentSegmentId);
      if (currentSegment) {
        const duration = timeToSeconds(currentSegment.duration || '00:00');
        
        updateVisualState({
          timeRemaining: duration,
          playbackStartTime: visualState.isPlaying ? Date.now() : null,
          controllerId: userId
        }, true, false); // Not critical, just a reset
        
        // If currently playing, restart the timer with the reset time
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, items, timeToSeconds, userId, updateVisualState, startTimer]);

  // Enhanced apply external visual state with better filtering
  const applyExternalVisualState = useCallback((externalState: any) => {
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

    // Skip updates if we're currently the controller (prevent conflicts)
    if (visualState.controllerId === userId && externalState.controllerId !== userId) {
      console.log('⏭️ Skipping external update - we are the controller');
      return;
    }

    lastProcessedUpdateRef.current = externalState.lastUpdate;
    
    console.log('📺 Applying external visual state from controller:', externalState.controllerId);
    
    stopTimer();
    
    // Convert plain object back to Map
    const statusMap = new Map();
    if (externalState.currentItemStatuses) {
      Object.entries(externalState.currentItemStatuses).forEach(([id, status]) => {
        statusMap.set(id, status as string);
      });
    }
    
    // Use timing synchronization utility
    const synchronizedState = calculateSynchronizedTimeRemaining({
      ...externalState,
      currentItemStatuses: statusMap
    });
    
    setVisualState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, calculateSynchronizedTimeRemaining, startTimer, visualState.controllerId, userId]);

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

  // Enhanced cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
    getItemVisualStatus,
    setItemVisualStatus,
    clearAllVisualStatuses,
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
    isInitialized
  };
};
