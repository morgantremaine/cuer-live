
import { useState, useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { supabase } from '@/integrations/supabase/client';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  currentSegmentIndex: number;
  controllerId: string | null;
  lastUpdate: string;
  isInitialized: boolean;
}

interface ShowcallerMasterProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
}

interface TimingStatus {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

export const useShowcallerMaster = ({
  items,
  rundownId,
  userId
}: ShowcallerMasterProps) => {
  // Single state object for all showcaller functionality
  const [state, setState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    currentSegmentIndex: -1,
    controllerId: null,
    lastUpdate: '',
    isInitialized: false
  });

  // Timing calculation state
  const [timingBaseline, setTimingBaseline] = useState<{
    startTime: string;
    segmentStartTime: Date;
    expectedPosition: number;
  } | null>(null);

  // Refs for stable operations
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const ownUpdateRef = useRef<string | null>(null);

  // Get regular (non-floating) items only
  const regularItems = items.filter(item => 
    item.type === 'regular' && !item.isFloating && !item.isFloated
  );

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Save state to database (debounced)
  const saveState = useCallback(() => {
    if (!rundownId || !state.isInitialized) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const showcallerState = {
          isPlaying: state.isPlaying,
          currentSegmentId: state.currentSegmentId,
          timeRemaining: state.timeRemaining,
          currentSegmentIndex: state.currentSegmentIndex,
          controllerId: state.controllerId,
          lastUpdate: new Date().toISOString()
        };

        await supabase
          .from('rundowns')
          .update({ showcaller_state: showcallerState })
          .eq('id', rundownId);
      } catch (error) {
        console.error('📺 Error saving showcaller state:', error);
      }
    }, 2000); // Debounce saves to every 2 seconds
  }, [rundownId, state]);

  // Initialize showcaller state
  useEffect(() => {
    if (!rundownId) return;

    const initialize = async () => {
      try {
        const { data } = await supabase
          .from('rundowns')
          .select('showcaller_state')
          .eq('id', rundownId)
          .single();

        if (data?.showcaller_state) {
          const savedState = data.showcaller_state;
          setState(prev => ({
            ...prev,
            isPlaying: savedState.isPlaying || false,
            currentSegmentId: savedState.currentSegmentId || null,
            timeRemaining: savedState.timeRemaining || 0,
            currentSegmentIndex: savedState.currentSegmentIndex || -1,
            controllerId: savedState.controllerId || null,
            lastUpdate: savedState.lastUpdate || '',
            isInitialized: true
          }));
        } else {
          setState(prev => ({ ...prev, isInitialized: true }));
        }
      } catch (error) {
        console.error('📺 Error initializing showcaller:', error);
        setState(prev => ({ ...prev, isInitialized: true }));
      }
    };

    initialize();
  }, [rundownId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!rundownId || !state.isInitialized) return;

    const channel = supabase
      .channel(`showcaller_${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          const newState = payload.new?.showcaller_state;
          if (newState && newState.lastUpdate !== ownUpdateRef.current) {
            setState(prev => ({
              ...prev,
              isPlaying: newState.isPlaying || false,
              currentSegmentId: newState.currentSegmentId || null,
              timeRemaining: newState.timeRemaining || 0,
              currentSegmentIndex: newState.currentSegmentIndex || -1,
              controllerId: newState.controllerId || null,
              lastUpdate: newState.lastUpdate || ''
            }));
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [rundownId, state.isInitialized]);

  // Timer logic - simple 1-second intervals
  useEffect(() => {
    if (state.isPlaying && state.timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1)
        }));
      }, 1000);
    } else {
      clearTimer();
    }

    return clearTimer;
  }, [state.isPlaying, state.timeRemaining, clearTimer]);

  // Auto-save state changes
  useEffect(() => {
    if (state.isInitialized) {
      saveState();
    }
  }, [state.isPlaying, state.currentSegmentId, state.timeRemaining, state.currentSegmentIndex, saveState]);

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    let targetSegmentId = selectedSegmentId || state.currentSegmentId;
    let targetIndex = state.currentSegmentIndex;

    // If no current segment or selecting a specific segment
    if (!targetSegmentId || selectedSegmentId) {
      if (selectedSegmentId) {
        targetIndex = regularItems.findIndex(item => item.id === selectedSegmentId);
        targetSegmentId = selectedSegmentId;
      } else {
        targetIndex = 0;
        targetSegmentId = regularItems[0]?.id || null;
      }
    }

    if (targetSegmentId && targetIndex >= 0) {
      const targetItem = regularItems[targetIndex];
      const duration = timeToSeconds(targetItem.duration || '00:00');
      
      // Set timing baseline when starting a new segment
      if (targetSegmentId !== state.currentSegmentId) {
        setTimingBaseline({
          startTime: targetItem.startTime || '00:00:00',
          segmentStartTime: new Date(),
          expectedPosition: targetIndex
        });
      }

      const timestamp = new Date().toISOString();
      ownUpdateRef.current = timestamp;

      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentSegmentId: targetSegmentId,
        currentSegmentIndex: targetIndex,
        timeRemaining: duration,
        controllerId: userId || 'unknown',
        lastUpdate: timestamp
      }));
    }
  }, [state.currentSegmentId, state.currentSegmentIndex, regularItems, userId]);

  const pause = useCallback(() => {
    const timestamp = new Date().toISOString();
    ownUpdateRef.current = timestamp;

    setState(prev => ({
      ...prev,
      isPlaying: false,
      lastUpdate: timestamp
    }));
  }, []);

  const forward = useCallback(() => {
    const nextIndex = state.currentSegmentIndex + 1;
    if (nextIndex < regularItems.length) {
      const nextItem = regularItems[nextIndex];
      const duration = timeToSeconds(nextItem.duration || '00:00');
      
      // Set new timing baseline
      setTimingBaseline({
        startTime: nextItem.startTime || '00:00:00',
        segmentStartTime: new Date(),
        expectedPosition: nextIndex
      });

      const timestamp = new Date().toISOString();
      ownUpdateRef.current = timestamp;

      setState(prev => ({
        ...prev,
        currentSegmentId: nextItem.id,
        currentSegmentIndex: nextIndex,
        timeRemaining: duration,
        controllerId: userId || 'unknown',
        lastUpdate: timestamp
      }));
    }
  }, [state.currentSegmentIndex, regularItems, userId]);

  const backward = useCallback(() => {
    const prevIndex = state.currentSegmentIndex - 1;
    if (prevIndex >= 0) {
      const prevItem = regularItems[prevIndex];
      const duration = timeToSeconds(prevItem.duration || '00:00');
      
      // Set new timing baseline
      setTimingBaseline({
        startTime: prevItem.startTime || '00:00:00',
        segmentStartTime: new Date(),
        expectedPosition: prevIndex
      });

      const timestamp = new Date().toISOString();
      ownUpdateRef.current = timestamp;

      setState(prev => ({
        ...prev,
        currentSegmentId: prevItem.id,
        currentSegmentIndex: prevIndex,
        timeRemaining: duration,
        controllerId: userId || 'unknown',
        lastUpdate: timestamp
      }));
    }
  }, [state.currentSegmentIndex, regularItems, userId]);

  const reset = useCallback(() => {
    clearTimer();
    setTimingBaseline(null);
    
    const timestamp = new Date().toISOString();
    ownUpdateRef.current = timestamp;

    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentSegmentId: null,
      timeRemaining: 0,
      currentSegmentIndex: -1,
      controllerId: null,
      lastUpdate: timestamp
    }));
  }, [clearTimer]);

  const jumpToSegment = useCallback((segmentId: string) => {
    const targetIndex = regularItems.findIndex(item => item.id === segmentId);
    if (targetIndex >= 0) {
      const targetItem = regularItems[targetIndex];
      const duration = timeToSeconds(targetItem.duration || '00:00');
      
      // Set new timing baseline
      setTimingBaseline({
        startTime: targetItem.startTime || '00:00:00',
        segmentStartTime: new Date(),
        expectedPosition: targetIndex
      });

      const timestamp = new Date().toISOString();
      ownUpdateRef.current = timestamp;

      setState(prev => ({
        ...prev,
        currentSegmentId: segmentId,
        currentSegmentIndex: targetIndex,
        timeRemaining: duration,
        controllerId: userId || 'unknown',
        lastUpdate: timestamp
      }));
    }
  }, [regularItems, userId]);

  // Calculate timing status
  const getTimingStatus = useCallback((rundownStartTime: string): TimingStatus => {
    // Only show timing when playing and we have a baseline
    if (!state.isPlaying || !state.currentSegmentId || !timingBaseline || !rundownStartTime) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    const now = new Date();
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    // Calculate real elapsed time from rundown start
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing
    if (realElapsedSeconds < 0) {
      realElapsedSeconds += 24 * 3600;
    }

    // Calculate where we should be in the rundown
    let expectedElapsedSeconds = 0;
    for (let i = 0; i < timingBaseline.expectedPosition; i++) {
      const item = regularItems[i];
      if (item) {
        expectedElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }

    // Add elapsed time in current segment
    const currentItem = regularItems[state.currentSegmentIndex];
    if (currentItem) {
      const segmentDuration = timeToSeconds(currentItem.duration || '00:00');
      const elapsedInSegment = segmentDuration - state.timeRemaining;
      expectedElapsedSeconds += elapsedInSegment;
    }

    // Calculate difference
    const differenceSeconds = expectedElapsedSeconds - realElapsedSeconds;
    
    // Determine status
    const isOnTime = Math.abs(differenceSeconds) <= 10; // 10 second tolerance
    const isAhead = differenceSeconds > 10; // We're ahead of schedule = under time
    
    return {
      isOnTime,
      isAhead,
      timeDifference: secondsToTime(Math.abs(differenceSeconds)),
      isVisible: true
    };
  }, [state.isPlaying, state.currentSegmentId, state.timeRemaining, state.currentSegmentIndex, timingBaseline, regularItems]);

  // Visual status for items
  const getItemVisualStatus = useCallback((itemId: string) => {
    if (!state.isPlaying) return 'upcoming';
    
    const currentIndex = state.currentSegmentIndex;
    const itemIndex = regularItems.findIndex(item => item.id === itemId);
    
    if (itemIndex < 0) return 'upcoming';
    
    if (itemIndex < currentIndex) return 'completed';
    if (itemIndex === currentIndex) return 'current';
    return 'upcoming';
  }, [state.isPlaying, state.currentSegmentIndex, regularItems]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimer();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [clearTimer]);

  return {
    // State
    isPlaying: state.isPlaying,
    currentSegmentId: state.currentSegmentId,
    timeRemaining: state.timeRemaining,
    isController: state.controllerId === userId,
    isInitialized: state.isInitialized,
    
    // Controls
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    
    // Utilities
    getTimingStatus,
    getItemVisualStatus
  };
};
