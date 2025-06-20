
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';

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

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Save showcaller visual state to database (completely separate from main rundown)
  const saveShowcallerVisualState = useCallback(async (state: ShowcallerVisualState) => {
    if (!rundownId) return;

    try {
      const { supabase } = await import('@/lib/supabase');
      
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
  }, [rundownId]);

  // Debounced save to prevent rapid database updates
  const debouncedSaveVisualState = useCallback((state: ShowcallerVisualState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerVisualState(state);
    }, 300);
  }, [saveShowcallerVisualState]);

  // Update visual state without touching main rundown state
  const updateVisualState = useCallback((updates: Partial<ShowcallerVisualState>, shouldSync: boolean = false) => {
    setVisualState(prev => {
      const newState = {
        ...prev,
        ...updates,
        lastUpdate: new Date().toISOString()
      };

      if (shouldSync) {
        debouncedSaveVisualState(newState);
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

  // Navigation helpers
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

  // Timer management
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const isController = visualState.controllerId === userId;
    
    timerRef.current = setInterval(() => {
      setVisualState(prevState => {
        if (prevState.timeRemaining <= 1) {
          if (isController && prevState.currentSegmentId) {
            // Move to next segment
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
              
              debouncedSaveVisualState(newState);
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
              
              debouncedSaveVisualState(newState);
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
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        // Sync every 30 seconds to reduce database load
        if (isController && prevState.timeRemaining % 30 === 0) {
          debouncedSaveVisualState(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [visualState.controllerId, userId, getNextSegment, timeToSeconds, debouncedSaveVisualState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions that only affect visual state
  const play = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Visual play called with segmentId:', selectedSegmentId);
    
    const newStatuses = new Map();
    
    if (selectedSegmentId) {
      // Mark segments before selected as completed, after as upcoming
      const selectedIndex = items.findIndex(item => item.id === selectedSegmentId);
      items.forEach((item, index) => {
        if (item.type === 'regular') {
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
      }, true);
    } else if (!visualState.currentSegmentId) {
      // Find first regular item
      const firstSegment = items.find(item => item.type === 'regular');
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
        }, true);
      }
    } else {
      // Resume current segment
      updateVisualState({
        isPlaying: true,
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true);
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
    }, true);
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
        }, true);
        
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
        }, true);
        
        if (visualState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [visualState, getPreviousSegment, timeToSeconds, userId, updateVisualState, startTimer]);

  // Apply external visual state
  const applyExternalVisualState = useCallback((externalState: any) => {
    console.log('📺 Applying external visual state from controller:', externalState.controllerId);
    
    stopTimer();
    
    // Convert plain object back to Map
    const statusMap = new Map();
    if (externalState.currentItemStatuses) {
      Object.entries(externalState.currentItemStatuses).forEach(([id, status]) => {
        statusMap.set(id, status as string);
      });
    }
    
    let synchronizedState = {
      ...externalState,
      currentItemStatuses: statusMap
    };
    
    // Calculate synchronized time remaining if playing
    if (externalState.isPlaying && externalState.playbackStartTime && externalState.currentSegmentId) {
      const segment = items.find(item => item.id === externalState.currentSegmentId);
      if (segment) {
        const segmentDuration = timeToSeconds(segment.duration || '00:00');
        const elapsedTime = Math.floor((Date.now() - externalState.playbackStartTime) / 1000);
        const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
        
        synchronizedState = {
          ...synchronizedState,
          timeRemaining: syncedTimeRemaining
        };
      }
    }
    
    setVisualState(synchronizedState);
    
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, items, timeToSeconds, startTimer]);

  // Initialize current segment
  useEffect(() => {
    if (!visualState.currentSegmentId && items.length > 0) {
      const firstSegment = items.find(item => item.type === 'regular');
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        setVisualState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
      }
    }
  }, [items.length, visualState.currentSegmentId, timeToSeconds]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
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
    applyExternalVisualState,
    isPlaying: visualState.isPlaying,
    currentSegmentId: visualState.currentSegmentId,
    timeRemaining: visualState.timeRemaining,
    isController: visualState.controllerId === userId
  };
};
