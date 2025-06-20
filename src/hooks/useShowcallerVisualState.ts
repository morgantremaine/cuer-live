
import { useState, useCallback, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface ShowcallerVisualState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  startTime: number | null;
  lastUpdateTime: number;
  userId?: string;
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
  const [visualState, setVisualState] = useState<ShowcallerVisualState>({
    isPlaying: false,
    currentSegmentId: null,
    startTime: null,
    lastUpdateTime: 0
  });

  const lastSaveRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Helper function to check if an item is floated
  const isFloated = (item: RundownItem): boolean => {
    return item.isFloating || item.isFloated || false;
  };

  // Helper function to get non-floated regular items only
  const getNonFloatedRegularItems = useCallback(() => {
    return items.filter(item => item.type === 'regular' && !isFloated(item));
  }, [items]);

  // Helper function to find the index of current segment in non-floated items
  const getCurrentSegmentIndex = useCallback(() => {
    if (!visualState.currentSegmentId) return -1;
    const nonFloatedItems = getNonFloatedRegularItems();
    return nonFloatedItems.findIndex(item => item.id === visualState.currentSegmentId);
  }, [visualState.currentSegmentId, getNonFloatedRegularItems]);

  // Calculate time remaining for current segment
  const timeRemaining = (() => {
    if (!visualState.isPlaying || !visualState.currentSegmentId || !visualState.startTime) {
      return null;
    }

    const currentItem = items.find(item => item.id === visualState.currentSegmentId);
    if (!currentItem || !currentItem.duration) return null;

    // Parse duration (MM:SS format)
    const durationParts = currentItem.duration.split(':');
    const totalSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
    
    const elapsed = Math.floor((Date.now() - visualState.startTime) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);
    
    return remaining;
  })();

  // Save state to database with debouncing
  const saveVisualState = useCallback(async (newState: ShowcallerVisualState) => {
    if (!rundownId) return;

    // Debounce saves to avoid too many database calls
    const now = Date.now();
    if (now - lastSaveRef.current < 500) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveVisualState(newState);
      }, 500);
      return;
    }

    lastSaveRef.current = now;

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: {
            ...newState,
            lastUpdateTime: now,
            userId: userId || null
          }
        })
        .eq('id', rundownId);

      if (error) {
        console.error('Error saving showcaller visual state:', error);
      } else {
        console.log('📺 Successfully saved showcaller visual state');
      }
    } catch (error) {
      console.error('Error saving showcaller state:', error);
    }
  }, [rundownId, userId]);

  // Track own updates to prevent feedback loops
  const trackOwnUpdate = useCallback((callback: () => void) => {
    callback();
  }, []);

  // Play function - starts from current segment or first non-floated segment
  const play = useCallback(() => {
    console.log('📺 Visual play called with segmentId:', visualState.currentSegmentId);
    
    const nonFloatedItems = getNonFloatedRegularItems();
    if (nonFloatedItems.length === 0) return;

    let targetSegmentId = visualState.currentSegmentId;
    
    // If no current segment or current segment is floated, start from first non-floated item
    if (!targetSegmentId || !nonFloatedItems.find(item => item.id === targetSegmentId)) {
      targetSegmentId = nonFloatedItems[0].id;
    }

    const newState = {
      ...visualState,
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };

    setVisualState(newState);
    saveVisualState(newState);
  }, [visualState, getNonFloatedRegularItems, saveVisualState]);

  // Forward function - moves to next non-floated segment
  const forward = useCallback(() => {
    console.log('📺 Visual forward called');
    
    const nonFloatedItems = getNonFloatedRegularItems();
    if (nonFloatedItems.length === 0) return;

    const currentIndex = getCurrentSegmentIndex();
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < nonFloatedItems.length) {
      const nextSegmentId = nonFloatedItems[nextIndex].id;
      const newState = {
        ...visualState,
        currentSegmentId: nextSegmentId,
        startTime: Date.now(),
        lastUpdateTime: Date.now()
      };

      setVisualState(newState);
      saveVisualState(newState);
    }
  }, [visualState, getCurrentSegmentIndex, getNonFloatedRegularItems, saveVisualState]);

  // Backward function - moves to previous non-floated segment
  const backward = useCallback(() => {
    console.log('📺 Visual backward called');
    
    const nonFloatedItems = getNonFloatedRegularItems();
    if (nonFloatedItems.length === 0) return;

    const currentIndex = getCurrentSegmentIndex();
    const prevIndex = currentIndex - 1;
    
    if (prevIndex >= 0) {
      const prevSegmentId = nonFloatedItems[prevIndex].id;
      const newState = {
        ...visualState,
        currentSegmentId: prevSegmentId,
        startTime: Date.now(),
        lastUpdateTime: Date.now()
      };

      setVisualState(newState);
      saveVisualState(newState);
    }
  }, [visualState, getCurrentSegmentIndex, getNonFloatedRegularItems, saveVisualState]);

  // Pause function
  const pause = useCallback(() => {
    console.log('📺 Visual pause called');
    
    const newState = {
      ...visualState,
      isPlaying: false,
      lastUpdateTime: Date.now()
    };

    setVisualState(newState);
    saveVisualState(newState);
  }, [visualState, saveVisualState]);

  // Reset function - stops playback and clears current segment
  const reset = useCallback(() => {
    console.log('📺 Visual reset called');
    
    const newState = {
      ...visualState,
      isPlaying: false,
      currentSegmentId: null,
      startTime: null,
      lastUpdateTime: Date.now()
    };

    setVisualState(newState);
    saveVisualState(newState);
  }, [visualState, saveVisualState]);

  // Apply external state (from realtime updates)
  const applyExternalVisualState = useCallback((externalState: ShowcallerVisualState) => {
    console.log('📺 Received external showcaller visual state');
    
    // Only apply if it's newer than our current state
    if (externalState.lastUpdateTime > visualState.lastUpdateTime) {
      setVisualState(externalState);
    } else {
      console.log('⏭️ Skipping own showcaller update');
    }
  }, [visualState.lastUpdateTime]);

  // Determine if this client is the controller (the one that initiated the current state)
  const isController = visualState.userId === userId;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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
    timeRemaining,
    isController,
    trackOwnUpdate
  };
};
