import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useShowcallerItemUpdates } from './useShowcallerItemUpdates';

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
    lastUpdate: new Date().toISOString(),
    controllerId: null
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const hasRestoredFromDatabase = useRef(false);

  const { updateItemSilent, clearCurrentStatusSilent } = useShowcallerItemUpdates({
    items,
    setItems,
    setShowcallerUpdate
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

  // Save showcaller state to database (separate from main rundown save)
  const saveShowcallerState = useCallback(async (state: ShowcallerState) => {
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
        console.error('❌ Failed to save showcaller state:', error);
      } else {
        console.log('📺 Successfully saved showcaller state');
      }
    } catch (error) {
      console.error('❌ Error saving showcaller state:', error);
    }
  }, [rundownId]);

  // Debounced save to prevent rapid database updates
  const debouncedSaveShowcallerState = useCallback((state: ShowcallerState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerState(state);
    }, 500); // 500ms debounce for showcaller state saves
  }, [saveShowcallerState]);

  // Load initial showcaller state from database
  const loadInitialShowcallerState = useCallback(async () => {
    if (!rundownId || hasRestoredFromDatabase.current) return;

    console.log('📺 Loading initial showcaller state from database');
    hasRestoredFromDatabase.current = true;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('❌ Error loading showcaller state:', error);
        return;
      }

      if (data?.showcaller_state) {
        console.log('📺 Restoring showcaller state:', data.showcaller_state);
        
        // Apply the external state which will handle timing synchronization
        applyShowcallerState(data.showcaller_state);
      }
    } catch (error) {
      console.error('❌ Error loading showcaller state:', error);
    }
  }, [rundownId]);

  // Update showcaller state internally and optionally sync
  const updateShowcallerState = useCallback((newState: Partial<ShowcallerState>, shouldSync: boolean = false) => {
    const updatedState = {
      ...showcallerState,
      ...newState,
      lastUpdate: new Date().toISOString()
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
        playbackStartTime: Date.now(),
        controllerId: userId
      }, true);
    }
  }, [items, clearCurrentStatusSilent, updateItemSilent, timeToSeconds, updateShowcallerState, userId]);

  // Enhanced timer management that preserves state across refreshes
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const isController = showcallerState.controllerId === userId;
    
    timerRef.current = setInterval(() => {
      setShowcallerState(prevState => {
        if (prevState.timeRemaining <= 1) {
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
                playbackStartTime: Date.now(),
                lastUpdate: new Date().toISOString()
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
                lastUpdate: new Date().toISOString()
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
        
        const newState = {
          ...prevState,
          timeRemaining: prevState.timeRemaining - 1,
          lastUpdate: new Date().toISOString()
        };
        
        // Sync every 10 seconds to reduce database load but maintain persistence
        if (isController && prevState.timeRemaining % 10 === 0) {
          debouncedSaveShowcallerState(newState);
        }
        
        return newState;
      });
    }, 1000);
  }, [showcallerState.controllerId, userId, updateItemSilent, getNextSegment, timeToSeconds, debouncedSaveShowcallerState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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
      playbackStartTime: Date.now(),
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
          playbackStartTime: showcallerState.isPlaying ? Date.now() : null,
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
          playbackStartTime: showcallerState.isPlaying ? Date.now() : null,
          controllerId: userId
        }, true);
        
        if (showcallerState.isPlaying) {
          startTimer();
        }
      }
    }
  }, [showcallerState, getPreviousSegment, updateItemSilent, timeToSeconds, userId, updateShowcallerState, startTimer]);

  // Enhanced external state application with proper timing synchronization
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
        const elapsedTime = Math.floor((Date.now() - externalState.playbackStartTime) / 1000);
        const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
        
        synchronizedState = {
          ...externalState,
          timeRemaining: syncedTimeRemaining
        };
      }
    }
    
    setShowcallerState(synchronizedState);
    
    // Restart timer if playing and there's time remaining
    if (synchronizedState.isPlaying && synchronizedState.timeRemaining > 0) {
      console.log('📺 Restarting timer after external state application');
      setTimeout(() => startTimer(), 100);
    }
  }, [stopTimer, clearCurrentStatusSilent, items, updateItemSilent, timeToSeconds, startTimer]);

  // Load initial state when component mounts or rundown changes
  useEffect(() => {
    if (rundownId && items.length > 0) {
      // Reset the restoration flag when rundown changes
      hasRestoredFromDatabase.current = false;
      loadInitialShowcallerState();
    }
  }, [rundownId, items.length, loadInitialShowcallerState]);

  // Initialize current segment only if no state was restored from database
  useEffect(() => {
    if (!showcallerState.currentSegmentId && items.length > 0 && hasRestoredFromDatabase.current) {
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
        clearInterval(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
