
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime, isFloated } from '@/utils/rundownCalculations';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  controllerId: string | null;
  lastUpdate: string;
  currentItemStatuses: Map<string, string>;
}

interface TimingStatus {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

interface UseShowcallerMasterProps {
  items: RundownItem[];
  rundownId: string | null;
  rundownStartTime: string;
}

export const useShowcallerMaster = ({
  items,
  rundownId,
  rundownStartTime
}: UseShowcallerMasterProps) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Single state object for all showcaller data
  const [state, setState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    playbackStartTime: null,
    controllerId: null,
    lastUpdate: new Date().toISOString(),
    currentItemStatuses: new Map()
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Single timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());

  // Initialize current segment on load
  useEffect(() => {
    if (!isInitialized && items.length > 0 && !state.currentSegmentId) {
      const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      if (firstSegment) {
        const duration = timeToSeconds(firstSegment.duration || '00:00');
        setState(prev => ({
          ...prev,
          currentSegmentId: firstSegment.id,
          timeRemaining: duration
        }));
      }
      setIsInitialized(true);
    }
  }, [items, isInitialized, state.currentSegmentId]);

  // Load initial state from database
  useEffect(() => {
    if (!rundownId || isInitialized) return;

    const loadInitialState = async () => {
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('showcaller_state')
          .eq('id', rundownId)
          .single();

        if (error || !data?.showcaller_state) {
          setIsInitialized(true);
          return;
        }

        const savedState = data.showcaller_state;
        const statusMap = new Map();
        
        if (savedState.currentItemStatuses) {
          Object.entries(savedState.currentItemStatuses).forEach(([id, status]) => {
            statusMap.set(id, status as string);
          });
        }

        setState(prev => ({
          ...prev,
          ...savedState,
          currentItemStatuses: statusMap
        }));
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load showcaller state:', error);
        setIsInitialized(true);
      }
    };

    loadInitialState();
  }, [rundownId, isInitialized]);

  // Set up realtime subscription
  useEffect(() => {
    if (!rundownId || !userId || !isInitialized) return;

    const channel = supabase
      .channel(`showcaller-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload: any) => {
          const showcallerState = payload.new?.showcaller_state;
          if (!showcallerState || !showcallerState.lastUpdate) return;

          // Skip our own updates
          if (ownUpdateTrackingRef.current.has(showcallerState.lastUpdate)) return;

          // Apply external state
          const statusMap = new Map();
          if (showcallerState.currentItemStatuses) {
            Object.entries(showcallerState.currentItemStatuses).forEach(([id, status]) => {
              statusMap.set(id, status as string);
            });
          }

          setState(prev => ({
            ...prev,
            ...showcallerState,
            currentItemStatuses: statusMap
          }));
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [rundownId, userId, isInitialized]);

  // Update current time every second when playing
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isPlaying]);

  // Single timer management
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setState(prevState => {
        if (!prevState.isPlaying || !prevState.currentSegmentId || !prevState.playbackStartTime) {
          return prevState;
        }

        const elapsed = Math.floor((Date.now() - prevState.playbackStartTime) / 1000);
        const currentSegment = items.find(item => item.id === prevState.currentSegmentId);
        
        if (!currentSegment) return prevState;

        const totalDuration = timeToSeconds(currentSegment.duration || '00:00');
        const remaining = Math.max(0, totalDuration - elapsed);

        // Auto-advance when time runs out
        if (remaining === 0 && prevState.controllerId === userId) {
          const nextSegment = getNextSegment(prevState.currentSegmentId);
          
          if (nextSegment) {
            const newStatuses = new Map(prevState.currentItemStatuses);
            newStatuses.set(prevState.currentSegmentId, 'completed');
            newStatuses.set(nextSegment.id, 'current');
            
            const newState = {
              ...prevState,
              currentSegmentId: nextSegment.id,
              timeRemaining: timeToSeconds(nextSegment.duration || '00:00'),
              playbackStartTime: Date.now(),
              currentItemStatuses: newStatuses,
              lastUpdate: new Date().toISOString()
            };
            
            saveState(newState);
            return newState;
          } else {
            // End of rundown
            const newState = {
              ...prevState,
              isPlaying: false,
              playbackStartTime: null,
              controllerId: null,
              lastUpdate: new Date().toISOString()
            };
            
            saveState(newState);
            return newState;
          }
        }

        return {
          ...prevState,
          timeRemaining: remaining,
          lastUpdate: new Date().toISOString()
        };
      });
    }, 1000);
  }, [items, userId]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Save state to database with debouncing
  const saveState = useCallback(async (stateToSave: ShowcallerState) => {
    if (!rundownId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const timestamp = new Date().toISOString();
        ownUpdateTrackingRef.current.add(timestamp);
        
        // Clean up old tracked updates
        setTimeout(() => {
          ownUpdateTrackingRef.current.delete(timestamp);
        }, 5000);

        const { error } = await supabase
          .from('rundowns')
          .update({
            showcaller_state: {
              ...stateToSave,
              currentItemStatuses: Object.fromEntries(stateToSave.currentItemStatuses)
            },
            updated_at: timestamp
          })
          .eq('id', rundownId);

        if (error) {
          console.error('Failed to save showcaller state:', error);
        }
      } catch (error) {
        console.error('Error saving showcaller state:', error);
      }
    }, 1000);
  }, [rundownId]);

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

  // Calculate timing status for over/under display
  const timingStatus: TimingStatus = useCallback(() => {
    if (!state.isPlaying || !state.currentSegmentId || !rundownStartTime) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    const currentSegmentIndex = items.findIndex(item => item.id === state.currentSegmentId);
    if (currentSegmentIndex === -1) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    // Calculate where showcaller should be vs where it actually is
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    // Calculate elapsed time in showcaller
    let showcallerElapsedSeconds = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    const currentSegment = items[currentSegmentIndex];
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - state.timeRemaining;
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Calculate real elapsed time
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    if (realElapsedSeconds < 0) {
      realElapsedSeconds += 24 * 3600; // Handle day crossing
    }

    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5;
    
    return {
      isOnTime,
      isAhead,
      timeDifference: secondsToTime(Math.abs(differenceSeconds)),
      isVisible: true
    };
  }, [state.isPlaying, state.currentSegmentId, state.timeRemaining, items, rundownStartTime, currentTime])();

  // Control functions
  const play = useCallback((selectedSegmentId?: string) => {
    const targetSegmentId = selectedSegmentId || state.currentSegmentId;
    if (!targetSegmentId) return;

    const targetSegment = items.find(item => item.id === targetSegmentId);
    if (!targetSegment || targetSegment.type !== 'regular' || isFloated(targetSegment)) return;

    const newStatuses = new Map();
    
    if (selectedSegmentId) {
      // Mark segments before selected as completed
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
    }

    const duration = timeToSeconds(targetSegment.duration || '00:00');
    const newState = {
      ...state,
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      timeRemaining: selectedSegmentId ? duration : state.timeRemaining,
      playbackStartTime: Date.now(),
      controllerId: userId,
      currentItemStatuses: selectedSegmentId ? newStatuses : state.currentItemStatuses,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);
    startTimer();
  }, [state, items, userId, saveState, startTimer]);

  const pause = useCallback(() => {
    const newState = {
      ...state,
      isPlaying: false,
      playbackStartTime: null,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);
    stopTimer();
  }, [state, userId, saveState, stopTimer]);

  const forward = useCallback(() => {
    if (!state.currentSegmentId) return;

    const nextSegment = getNextSegment(state.currentSegmentId);
    if (!nextSegment) return;

    const newStatuses = new Map(state.currentItemStatuses);
    newStatuses.set(state.currentSegmentId, 'completed');
    newStatuses.set(nextSegment.id, 'current');

    const duration = timeToSeconds(nextSegment.duration || '00:00');
    const newState = {
      ...state,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration,
      playbackStartTime: state.isPlaying ? Date.now() : null,
      controllerId: userId,
      currentItemStatuses: newStatuses,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);

    if (state.isPlaying) {
      startTimer();
    }
  }, [state, getNextSegment, userId, saveState, startTimer]);

  const backward = useCallback(() => {
    if (!state.currentSegmentId) return;

    const prevSegment = getPreviousSegment(state.currentSegmentId);
    if (!prevSegment) return;

    const newStatuses = new Map(state.currentItemStatuses);
    newStatuses.set(state.currentSegmentId, 'upcoming');
    newStatuses.set(prevSegment.id, 'current');

    const duration = timeToSeconds(prevSegment.duration || '00:00');
    const newState = {
      ...state,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration,
      playbackStartTime: state.isPlaying ? Date.now() : null,
      controllerId: userId,
      currentItemStatuses: newStatuses,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);

    if (state.isPlaying) {
      startTimer();
    }
  }, [state, getPreviousSegment, userId, saveState, startTimer]);

  const reset = useCallback(() => {
    if (!state.currentSegmentId) return;

    const currentSegment = items.find(item => item.id === state.currentSegmentId);
    if (!currentSegment) return;

    const duration = timeToSeconds(currentSegment.duration || '00:00');
    const newState = {
      ...state,
      timeRemaining: duration,
      playbackStartTime: state.isPlaying ? Date.now() : null,
      controllerId: userId,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);

    if (state.isPlaying) {
      startTimer();
    }
  }, [state, items, userId, saveState, startTimer]);

  const jumpToSegment = useCallback((segmentId: string) => {
    const targetSegment = items.find(item => item.id === segmentId);
    if (!targetSegment || targetSegment.type !== 'regular' || isFloated(targetSegment)) return;

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
    const newState = {
      ...state,
      currentSegmentId: segmentId,
      timeRemaining: duration,
      playbackStartTime: state.isPlaying ? Date.now() : null,
      controllerId: userId,
      currentItemStatuses: newStatuses,
      lastUpdate: new Date().toISOString()
    };

    setState(newState);
    saveState(newState);

    if (state.isPlaying) {
      startTimer();
    }
  }, [state, items, userId, saveState, startTimer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  return {
    // State
    isPlaying: state.isPlaying,
    currentSegmentId: state.currentSegmentId,
    timeRemaining: state.timeRemaining,
    isController: state.controllerId === userId,
    isInitialized,
    
    // Timing status
    timingStatus,
    
    // Visual status
    getItemVisualStatus: useCallback((itemId: string) => {
      return state.currentItemStatuses.get(itemId) || 'upcoming';
    }, [state.currentItemStatuses]),
    
    // Controls
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment
  };
};
