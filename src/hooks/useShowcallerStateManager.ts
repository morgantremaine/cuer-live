
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { useShowcallerItemUpdates } from './useShowcallerItemUpdates';
import { useUniversalTiming } from './useUniversalTiming';
import { getUniversalDate } from '@/services/UniversalTimeService';
import { useUniversalTimer } from './useUniversalTimer';

export interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

interface UseShowcallerStateManagerProps {
  items: RundownItem[];
  setItems: (items: RundownItem[]) => void;
  rundownId: string | null;
  userId?: string;
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useShowcallerStateManager = ({
  items,
  setItems,
  rundownId,
  userId,
  setShowcallerUpdate
}: UseShowcallerStateManagerProps) => {
  const [showcallerState, setShowcallerState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    lastUpdate: getUniversalDate().toISOString(),
    controllerId: null
  });

  const timerRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<string | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const { getUniversalTime } = useUniversalTiming();
  const { setInterval: setManagedInterval, setTimeout: setManagedTimeout, clearTimer } = useUniversalTimer('ShowcallerStateManager');

  const { updateItemSilent, clearCurrentStatusSilent } = useShowcallerItemUpdates({
    items,
    setItems,
    setShowcallerUpdate
  });

  // Helper function to convert time string to seconds - ensure integer results
  const timeToSeconds = useCallback((timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return Math.floor(minutes * 60 + seconds);
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return Math.floor(hours * 3600 + minutes * 60 + seconds);
    }
    return 0;
  }, []);

  // Save showcaller state to database
  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
    if (!rundownId) return;

    try {
      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: state,
          updated_at: getUniversalDate().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        console.error('❌ Failed to save showcaller state:', error);
      } else {
        console.log('📺 Successfully saved showcaller state');
      }
    } catch (error) {
      console.error('❌ Error saving showcaller state:', error);
    }
  }, [rundownId]);

  // Debounced save
  const debouncedSaveShowcallerState = useCallback((state: ShowcallerState) => {
    if (saveTimeoutRef.current) {
      clearTimer(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setManagedTimeout(() => {
      saveShowcallerState(state);
    }, 500);
  }, [saveShowcallerState, clearTimer, setManagedTimeout]);

  // Update showcaller state
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: getUniversalDate().toISOString()
    };
    
    setShowcallerState(updatedState);
    
    if (shouldSync) {
      debouncedSaveShowcallerState(updatedState);
    }
  }, [showcallerState, debouncedSaveShowcallerState]);

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

  // Set current segment
  const setCurrentSegment = useCallback((segmentId: string) => {
    clearCurrentStatusSilent();
    const segment = items.find(item => item.id === segmentId);
    
    if (segment && segment.type === 'regular') {
      updateItemSilent(segmentId, 'status', 'current');
      const duration = timeToSeconds(segment.duration || '00:00');
      
      updateShowcallerState({
        currentSegmentId: segmentId,
        timeRemaining: duration,
        playbackStartTime: getUniversalTime(), // Use synchronized universal time
        controllerId: userId
      }, true);
    }
  }, [items, clearCurrentStatusSilent, updateItemSilent, timeToSeconds, updateShowcallerState, userId]);

  // Single authoritative timer with consistent 1-second precision
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const isController = showcallerState.controllerId === userId;
    
    timerRef.current = setManagedInterval(() => {
      setShowcallerState(prevState => {
        // Ensure we're working with integer seconds only
        const currentTimeRemaining = Math.floor(prevState.timeRemaining);
        
        if (currentTimeRemaining <= 0) {
          if (isController && prevState.currentSegmentId) {
            updateItemSilent(prevState.currentSegmentId, 'status', 'completed');
            const nextSegment = getNextSegment(prevState.currentSegmentId);
            
            if (nextSegment) {
              const duration = timeToSeconds(nextSegment.duration || '00:00');
              updateItemSilent(nextSegment.id, 'status', 'current');
              
              const newState = {
                ...prevState,
                currentSegmentId: nextSegment.id,
                timeRemaining: duration,
                playbackStartTime: getUniversalTime(), // Use synchronized universal time
                lastUpdate: getUniversalDate().toISOString()
              };
              
              debouncedSaveShowcallerState(newState);
              return newState;
            } else {
              const newState = {
                ...prevState,
                isPlaying: false,
                currentSegmentId: null,
                timeRemaining: 0,
                playbackStartTime: null,
                controllerId: null,
                lastUpdate: getUniversalDate().toISOString()
              };
              
              debouncedSaveShowcallerState(newState);
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
        
        // Consistent integer countdown
        const newTimeRemaining = Math.max(0, currentTimeRemaining - 1);
        const newState = {
          ...prevState,
          timeRemaining: newTimeRemaining,
          lastUpdate: getUniversalDate().toISOString()
        };
        
        // Sync every 10 seconds to reduce database load
        if (isController && currentTimeRemaining % 10 === 0) {
          debouncedSaveShowcallerState(newState);
        }
        
        return newState;
      });
    }, 1000); // Exactly 1 second intervals
  }, [showcallerState.controllerId, userId, updateItemSilent, getNextSegment, timeToSeconds, debouncedSaveShowcallerState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimer(timerRef.current);
      timerRef.current = null;
    }
  }, [clearTimer]);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Play called with segmentId:', selectedSegmentId, 'by user:', userId);
    
    if (selectedSegmentId) {
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (item.type === 'regular') {
          if (index < selectedIndex) {
            updateItemSilent(item.id, 'status', 'completed');
          } else if (index > selectedIndex) {
            updateItemSilent(item.id, 'status', 'upcoming');
          }
        }
      });
      setCurrentSegment(selectedSegmentId);
    } else if (!showcallerState.currentSegmentId) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        setCurrentSegment(firstSegment.id);
      }
    } else {
      const currentSegment = items.find(item => item.id === showcallerState.currentSegmentId);
      if (currentSegment) {
        updateItemSilent(currentSegment.id, 'status', 'current');
      }
    }
    
    updateShowcallerState({ 
      isPlaying: true,
      playbackStartTime: getUniversalTime(), // Use synchronized universal time
      controllerId: userId
    }, true);
    
    startTimer();
  }, [items, updateItemSilent, setCurrentSegment, updateShowcallerState, showcallerState.currentSegmentId, userId, startTimer]);

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
    console.log('📺 Forward called by user:', userId);

    if (showcallerState.currentSegmentId) {
      const nextSegment = getNextSegment(showcallerState.currentSegmentId);
      if (nextSegment) {
        updateItemSilent(showcallerState.currentSegmentId, 'status', 'completed');
        updateItemSilent(nextSegment.id, 'status', 'current');
        
        const duration = timeToSeconds(nextSegment.duration || '00:00');
        
        updateShowcallerState({
          currentSegmentId: nextSegment.id,
          timeRemaining: duration,
          playbackStartTime: showcallerState.isPlaying ? getUniversalTime() : null, // Use synchronized universal time
          controllerId: userId
        }, true);
        
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState, getNextSegment, updateItemSilent, timeToSeconds, userId, updateShowcallerState, startTimer]);

  const backward = useCallback(() => {
    console.log('📺 Backward called by user:', userId);

    if (showcallerState.currentSegmentId) {
      const prevSegment = getPreviousSegment(showcallerState.currentSegmentId);
      if (prevSegment) {
        updateItemSilent(showcallerState.currentSegmentId, 'status', 'upcoming');
        updateItemSilent(prevSegment.id, 'status', 'current');
        
        const duration = timeToSeconds(prevSegment.duration || '00:00');
        
        updateShowcallerState({
          currentSegmentId: prevSegment.id,
          timeRemaining: duration,
          playbackStartTime: showcallerState.isPlaying ? getUniversalTime() : null, // Use synchronized universal time
          controllerId: userId
        }, true);
        
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState, getPreviousSegment, updateItemSilent, timeToSeconds, userId, updateShowcallerState, startTimer]);

  // Apply external showcaller state with proper time synchronization
  const applyShowcallerState = useCallback((externalState: ShowcallerState) => {
    if (lastSyncedStateRef.current === externalState.lastUpdate) {
      return;
    }
    lastSyncedStateRef.current = externalState.lastUpdate;
    
    console.log('📺 Applying external showcaller state from controller:', externalState.controllerId);
    
    stopTimer();
    clearCurrentStatusSilent();
    
    if (externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        updateItemSilent(externalState.currentSegmentId, 'status', 'current');
      }
    }
    
    // Calculate synchronized time remaining if playing
    let synchronizedState = { ...externalState };
    
    if (externalState.isPlaying && externalState.playbackStartTime && externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        const segmentDuration = timeToSeconds(segment.duration || '00:00');
        const currentUniversalTime = getUniversalTime();
        const elapsedTime = Math.floor((currentUniversalTime - externalState.playbackStartTime) / 1000);
        
        // Add debug logging to catch timing issues
        console.log('📺 Time sync calculation:', {
          segmentDuration,
          currentUniversalTime,
          playbackStartTime: externalState.playbackStartTime,
          elapsedTime,
          originalTimeRemaining: externalState.timeRemaining
        });
        
        // Validate elapsed time is reasonable (not negative or extremely large)
        if (elapsedTime < 0 || elapsedTime > segmentDuration + 3600) { // Max 1 hour drift allowed
          console.warn('📺 Suspicious elapsed time detected, using original timeRemaining:', elapsedTime);
          // Use the original time remaining instead of calculated value
          synchronizedState = { ...externalState };
        } else {
          const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
          synchronizedState = {
            ...externalState,
            timeRemaining: syncedTimeRemaining
          };
        }
      }
    }
    
    setShowcallerState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setManagedTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, clearCurrentStatusSilent, items, updateItemSilent, timeToSeconds, startTimer, setManagedTimeout]);

  // Initialize current segment
  useEffect(() => {
    if (!showcallerState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        setShowcallerState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
      }
    }
  }, [items.length, showcallerState.currentSegmentId, timeToSeconds]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimer(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimer(saveTimeoutRef.current);
      }
    };
  }, [clearTimer]);

  return {
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining,
    isController: showcallerState.controllerId === userId
  };
};
