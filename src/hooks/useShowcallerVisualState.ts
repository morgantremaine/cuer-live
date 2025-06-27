
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds } from '@/utils/rundownCalculations';
import { logger } from '@/utils/logger';

interface ShowcallerVisualState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
  segmentStartTime: number | null; // Track when the current segment actually started
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
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: new Date().toISOString(),
    controllerId: null,
    segmentStartTime: null
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const driftCorrectionRef = useRef<number>(0); // Track accumulated drift
  const lastRealTimeRef = useRef<number>(0); // Track last real time check

  // Clear any existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Save visual state to database with debouncing
  const saveVisualState = useCallback(async (state: ShowcallerVisualState) => {
    if (!rundownId) return;

    try {
      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: state,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        logger.error('❌ Failed to save showcaller visual state:', error);
      } else {
        logger.log('📺 Successfully saved showcaller visual state');
      }
    } catch (error) {
      logger.error('❌ Error saving showcaller visual state:', error);
    }
  }, [rundownId]);

  // Debounced save to prevent rapid database updates
  const debouncedSave = useCallback((state: ShowcallerVisualState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveVisualState(state);
    }, 500);
  }, [saveVisualState]);

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

  // Start the precision timer with drift correction
  const startPrecisionTimer = useCallback(() => {
    clearTimer();
    
    const now = Date.now();
    lastRealTimeRef.current = now;
    driftCorrectionRef.current = 0;

    timerRef.current = setInterval(() => {
      const currentRealTime = Date.now();
      const expectedElapsed = currentRealTime - lastRealTimeRef.current;
      const actualElapsed = 1000; // 1 second timer interval
      
      // Calculate drift (positive means we're running slow, negative means fast)
      const drift = expectedElapsed - actualElapsed;
      driftCorrectionRef.current += drift;
      
      // Apply drift correction every 10 seconds
      const correctionThreshold = 10000; // 10 seconds
      let adjustedDecrement = 1;
      
      if (Math.abs(driftCorrectionRef.current) > correctionThreshold) {
        // Apply small correction to catch up/slow down
        const correctionFactor = Math.sign(driftCorrectionRef.current) * 0.1;
        adjustedDecrement = 1 + correctionFactor;
        driftCorrectionRef.current *= 0.9; // Reduce accumulated drift
      }

      lastRealTimeRef.current = currentRealTime;

      setVisualState(prevState => {
        if (!prevState.isPlaying || !prevState.currentSegmentId) {
          return prevState;
        }

        const newTimeRemaining = Math.max(0, prevState.timeRemaining - adjustedDecrement);
        
        // If segment is complete, move to next
        if (newTimeRemaining <= 0) {
          const nextSegment = getNextSegment(prevState.currentSegmentId);
          
          if (nextSegment) {
            const duration = timeToSeconds(nextSegment.duration || '00:00');
            const newState = {
              ...prevState,
              currentSegmentId: nextSegment.id,
              timeRemaining: duration,
              segmentStartTime: Date.now(),
              playbackStartTime: Date.now(),
              lastUpdate: new Date().toISOString()
            };
            
            debouncedSave(newState);
            return newState;
          } else {
            // End of rundown
            const newState = {
              ...prevState,
              isPlaying: false,
              currentSegmentId: null,
              timeRemaining: 0,
              playbackStartTime: null,
              segmentStartTime: null,
              controllerId: null,
              lastUpdate: new Date().toISOString()
            };
            
            debouncedSave(newState);
            return newState;
          }
        }

        // Regular countdown
        const newState = {
          ...prevState,
          timeRemaining: newTimeRemaining,
          lastUpdate: new Date().toISOString()
        };

        // Sync to database every 5 seconds when playing
        if (prevState.controllerId === userId && Math.floor(newTimeRemaining) % 5 === 0) {
          debouncedSave(newState);
        }

        return newState;
      });
    }, 1000);
  }, [clearTimer, getNextSegment, debouncedSave, userId]);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    logger.log('📺 Visual play called with segmentId:', selectedSegmentId);
    
    const targetSegmentId = selectedSegmentId || visualState.currentSegmentId;
    
    if (!targetSegmentId) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (!firstSegment) return;
      
      const duration = timeToSeconds(firstSegment.duration || '00:00');
      const now = Date.now();
      
      const newState = {
        ...visualState,
        isPlaying: true,
        currentSegmentId: firstSegment.id,
        timeRemaining: duration,
        playbackStartTime: now,
        segmentStartTime: now,
        controllerId: userId,
        lastUpdate: new Date().toISOString()
      };
      
      setVisualState(newState);
      debouncedSave(newState);
      startPrecisionTimer();
      return;
    }

    const segment = items.find(item => item.id === targetSegmentId);
    if (!segment) return;

    const duration = timeToSeconds(segment.duration || '00:00');
    const now = Date.now();
    
    const newState = {
      ...visualState,
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      timeRemaining: duration,
      playbackStartTime: now,
      segmentStartTime: now,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
    startPrecisionTimer();
  }, [visualState, items, userId, debouncedSave, startPrecisionTimer]);

  const pause = useCallback(() => {
    logger.log('📺 Visual pause called');
    
    clearTimer();
    
    const newState = {
      ...visualState,
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
  }, [visualState, userId, clearTimer, debouncedSave]);

  const forward = useCallback(() => {
    logger.log('📺 Visual forward called');
    
    if (!visualState.currentSegmentId) return;
    
    const nextSegment = getNextSegment(visualState.currentSegmentId);
    if (!nextSegment) return;

    const duration = timeToSeconds(nextSegment.duration || '00:00');
    const now = Date.now();
    
    const newState = {
      ...visualState,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration,
      playbackStartTime: visualState.isPlaying ? now : null,
      segmentStartTime: now,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
    
    if (visualState.isPlaying) {
      startPrecisionTimer();
    }
  }, [visualState, getNextSegment, userId, debouncedSave, startPrecisionTimer]);

  const backward = useCallback(() => {
    logger.log('📺 Visual backward called');
    
    if (!visualState.currentSegmentId) return;
    
    const prevSegment = getPreviousSegment(visualState.currentSegmentId);
    if (!prevSegment) return;

    const duration = timeToSeconds(prevSegment.duration || '00:00');
    const now = Date.now();
    
    const newState = {
      ...visualState,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration,
      playbackStartTime: visualState.isPlaying ? now : null,
      segmentStartTime: now,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
    
    if (visualState.isPlaying) {
      startPrecisionTimer();
    }
  }, [visualState, getPreviousSegment, userId, debouncedSave, startPrecisionTimer]);

  const reset = useCallback(() => {
    logger.log('📺 Visual reset called');
    
    clearTimer();
    
    const newState = {
      isPlaying: false,
      currentSegmentId: null,
      timeRemaining: 0,
      playbackStartTime: null,
      segmentStartTime: null,
      controllerId: null,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
  }, [clearTimer, debouncedSave]);

  const jumpToSegment = useCallback((segmentId: string) => {
    logger.log('📺 Visual jump to segment called:', segmentId);
    
    const segment = items.find(item => item.id === segmentId);
    if (!segment || segment.type !== 'regular') return;

    const duration = timeToSeconds(segment.duration || '00:00');
    const now = Date.now();
    
    const newState = {
      ...visualState,
      currentSegmentId: segmentId,
      timeRemaining: duration,
      playbackStartTime: visualState.isPlaying ? now : null,
      segmentStartTime: now,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };
    
    setVisualState(newState);
    debouncedSave(newState);
    
    if (visualState.isPlaying) {
      startPrecisionTimer();
    }
  }, [visualState, items, userId, debouncedSave, startPrecisionTimer]);

  // Apply external visual state with improved synchronization
  const applyExternalVisualState = useCallback((externalState: ShowcallerVisualState) => {
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;
    
    logger.log('📺 Applying external visual state from controller:', externalState.controllerId);
    
    clearTimer();
    
    // Calculate synchronized time remaining if playing
    let synchronizedState = { ...externalState };
    
    if (externalState.isPlaying && externalState.segmentStartTime && externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        const segmentDuration = timeToSeconds(segment.duration || '00:00');
        const elapsedTime = Math.floor((Date.now() - externalState.segmentStartTime) / 1000);
        const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
        
        logger.log('📺 Synchronized timing:', {
          originalRemaining: externalState.timeRemaining,
          syncedRemaining: syncedTimeRemaining,
          elapsedTime,
          segmentDuration
        });
      }
    }
    
    setVisualState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startPrecisionTimer(), 100);
    }
  }, [clearTimer, items, startPrecisionTimer]);

  // Get visual status for items
  const getItemVisualStatus = useCallback((item: RundownItem) => {
    if (item.type !== 'regular') return 'upcoming';
    
    if (item.id === visualState.currentSegmentId) {
      return 'current';
    }
    
    const currentIndex = items.findIndex(i => i.id === visualState.currentSegmentId);
    const itemIndex = items.findIndex(i => i.id === item.id);
    
    if (currentIndex === -1) return 'upcoming';
    
    return itemIndex < currentIndex ? 'completed' : 'upcoming';
  }, [visualState.currentSegmentId, items]);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      if (!rundownId || isInitialized) return;

      try {
        logger.log('📺 Loading initial showcaller state for rundown:', rundownId);
        
        const { data, error } = await supabase
          .from('rundowns')
          .select('showcaller_state')
          .eq('id', rundownId)
          .single();

        if (error) {
          logger.error('Error loading showcaller state:', error);
        } else if (data?.showcaller_state) {
          logger.log('📺 Found saved showcaller state:', data.showcaller_state);
          logger.log('📺 Applying loaded initial state');
          applyExternalVisualState(data.showcaller_state);
        }
      } catch (error) {
        logger.error('Failed to load showcaller state:', error);
      }
      
      setIsInitialized(true);
    };

    loadInitialState();
  }, [rundownId, isInitialized, applyExternalVisualState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [clearTimer]);

  return {
    visualState,
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    applyExternalVisualState,
    getItemVisualStatus,
    isPlaying: visualState.isPlaying,
    currentSegmentId: visualState.currentSegmentId,
    timeRemaining: visualState.timeRemaining,
    isController: visualState.controllerId === userId,
    isInitialized
  };
};
