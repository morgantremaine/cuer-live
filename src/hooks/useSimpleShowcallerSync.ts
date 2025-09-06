import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';
import { useShowcallerBroadcastSync } from './useShowcallerBroadcastSync';
import { useShowcallerPersistence } from './useShowcallerPersistence';
import { ShowcallerBroadcastState } from '@/utils/showcallerBroadcast';

export interface SimpleShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  currentItemStatuses: Record<string, string>; // Simplified to plain object
  isController: boolean;
  controllerId: string | null;
  lastUpdate: string;
}

interface UseSimpleShowcallerSyncProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
}

export const useSimpleShowcallerSync = ({
  items,
  rundownId,
  userId
}: UseSimpleShowcallerSyncProps) => {
  const [state, setState] = useState<SimpleShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    currentItemStatuses: {},
    isController: false,
    controllerId: null,
    lastUpdate: new Date().toISOString()
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');
  const hasLoadedInitialState = useRef(false);
  const lastTrackedUpdate = useRef<string>('');

  // Setup persistence
  const { saveShowcallerState, loadShowcallerState } = useShowcallerPersistence({
    rundownId,
    trackOwnUpdate: (timestamp: string) => {
      lastTrackedUpdate.current = timestamp;
    }
  });

  // Helper functions
  const parseDurationToSeconds = useCallback((str: string | undefined) => {
    if (!str) return 0;
    const parts = str.split(':').map(n => Number(n) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }, []);

  const findNextSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items]);

  const findPrevSegment = useCallback((currentId: string) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items]);

  const buildStatusMap = useCallback((segmentId?: string | null): Record<string, string> => {
    if (!segmentId) return {};
    const status: Record<string, string> = {};
    const selectedIndex = items.findIndex(item => item.id === segmentId);
    if (selectedIndex === -1) return {};
    
    items.forEach((item, index) => {
      if (item.type === 'regular' && !isFloated(item)) {
        if (index < selectedIndex) status[item.id] = 'completed';
        else if (index === selectedIndex) status[item.id] = 'current';
      }
    });
    return status;
  }, [items]);

  // Load initial state on mount
  useEffect(() => {
    if (!rundownId || !items.length || hasLoadedInitialState.current) return;

    const loadInitialShowcallerState = async () => {
      console.log('📺 Simple: Loading initial showcaller state...');
      
      try {
        const savedState = await loadShowcallerState();
        
        if (savedState && savedState.currentSegmentId) {
          // Apply saved state
          console.log('📺 Simple: Loaded saved state:', savedState.currentSegmentId);
          const statusMap = buildStatusMap(savedState.currentSegmentId);
          
          setState({
            isPlaying: savedState.isPlaying || false,
            currentSegmentId: savedState.currentSegmentId,
            timeRemaining: savedState.timeRemaining || 0,
            currentItemStatuses: statusMap,
            isController: false, // Always start as non-controller
            controllerId: savedState.controllerId || null,
            lastUpdate: savedState.lastUpdate || new Date().toISOString()
          });
          
          if (savedState.lastUpdate) {
            lastTrackedUpdate.current = savedState.lastUpdate;
          }
        } else {
          // No saved state - set default to first non-floated item
          const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
          if (firstSegment) {
            console.log('📺 Simple: Setting default to first item:', firstSegment.id);
            const statusMap = buildStatusMap(firstSegment.id);
            const defaultState = {
              isPlaying: false,
              currentSegmentId: firstSegment.id,
              timeRemaining: parseDurationToSeconds(firstSegment.duration),
              currentItemStatuses: statusMap,
              isController: false,
              controllerId: null,
              lastUpdate: new Date().toISOString()
            };
            
            setState(defaultState);
            
            // Save this default state to the database
            await saveShowcallerState({
              isPlaying: defaultState.isPlaying,
              currentSegmentId: defaultState.currentSegmentId,
              timeRemaining: defaultState.timeRemaining,
              playbackStartTime: null,
              lastUpdate: defaultState.lastUpdate,
              controllerId: defaultState.controllerId
            });
          }
        }
      } catch (error) {
        console.error('📺 Simple: Error loading initial state:', error);
      } finally {
        hasLoadedInitialState.current = true;
      }
    };

    loadInitialShowcallerState();
  }, [rundownId, items, loadShowcallerState, saveShowcallerState, buildStatusMap, parseDurationToSeconds]);

  // Reset on rundown change
  useEffect(() => {
    hasLoadedInitialState.current = false;
  }, [rundownId]);

  // Broadcast sync setup
  const { broadcastState, isConnected } = useShowcallerBroadcastSync({
    rundownId,
    onBroadcastReceived: (broadcastState: ShowcallerBroadcastState) => {
      console.log('📺 Simple: Received broadcast:', broadcastState.action);
      
      // Skip our own updates
      if (broadcastState.userId === userId) return;
      
      // Skip duplicate updates
      if (broadcastState.timestamp.toString() === lastUpdateRef.current) return;
      lastUpdateRef.current = broadcastState.timestamp.toString();
      
      // Skip updates we've already processed from persistence
      if (broadcastState.timestamp.toString() === lastTrackedUpdate.current) return;

      // Apply the complete state directly - no local calculations
      setState({
        isPlaying: !!broadcastState.isPlaying,
        currentSegmentId: broadcastState.currentSegmentId || null,
        timeRemaining: broadcastState.timeRemaining || 0,
        currentItemStatuses: buildStatusMap(broadcastState.currentSegmentId),
        isController: false, // Receivers are never controllers
        controllerId: broadcastState.userId,
        lastUpdate: new Date(broadcastState.timestamp).toISOString()
      });
    },
    enabled: true
  });

  // Simple controller timer - broadcasts complete state every second
  const startControllerTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    console.log('📺 Simple: Starting controller timer');
    
    timerRef.current = setInterval(() => {
      setState(prevState => {
        if (!prevState.isPlaying || !prevState.currentSegmentId) {
          return prevState;
        }

        const newTimeRemaining = Math.max(0, prevState.timeRemaining - 1);
        let newState = { ...prevState, timeRemaining: newTimeRemaining };

        // Auto-advance when time runs out (only for controllers)
        if (newTimeRemaining === 0 && prevState.isController) {
          const nextSegment = findNextSegment(prevState.currentSegmentId);
          if (nextSegment) {
            const nextDuration = parseDurationToSeconds(nextSegment.duration);
            newState = {
              ...newState,
              currentSegmentId: nextSegment.id,
              timeRemaining: nextDuration,
              currentItemStatuses: buildStatusMap(nextSegment.id)
            };
            console.log('📺 Simple: Auto-advancing to next segment:', nextSegment.id);
          } else {
            // End of rundown
            newState = {
              ...newState,
              isPlaying: false,
              currentSegmentId: null,
              timeRemaining: 0,
              currentItemStatuses: {}
            };
            console.log('📺 Simple: End of rundown reached');
          }
        }

        // Broadcast the complete state
        if (newState.isController) {
          broadcastState({
            action: 'sync',
            isPlaying: newState.isPlaying,
            currentSegmentId: newState.currentSegmentId,
            timeRemaining: newState.timeRemaining
          });
        }

        return newState;
      });
    }, 1000);
  }, [findNextSegment, parseDurationToSeconds, buildStatusMap, broadcastState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Control functions (only for controllers)
  const play = useCallback((segmentId?: string) => {
    console.log('📺 Simple: Play called:', { segmentId, userId });
    
    const targetSegmentId = segmentId || state.currentSegmentId || 
      items.find(item => item.type === 'regular' && !isFloated(item))?.id || null;
    
    if (!targetSegmentId) return;
    
    const segment = items.find(item => item.id === targetSegmentId);
    const duration = segment ? parseDurationToSeconds(segment.duration) : 0;
    
    const newState = {
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(targetSegmentId),
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    startControllerTimer();
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    // Broadcast immediately
    broadcastState({
      action: 'play',
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      timeRemaining: duration
    });
  }, [state.currentSegmentId, items, parseDurationToSeconds, buildStatusMap, userId, startControllerTimer, broadcastState]);

  const pause = useCallback(() => {
    console.log('📺 Simple: Pause called');
    
    const newState = { ...state, isPlaying: false, isController: true };
    setState(newState);
    stopTimer();
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    broadcastState({
      action: 'pause',
      isPlaying: false,
      currentSegmentId: state.currentSegmentId,
      timeRemaining: state.timeRemaining
    });
  }, [stopTimer, broadcastState, state.currentSegmentId, state.timeRemaining]);

  const forward = useCallback(() => {
    if (!state.currentSegmentId) return;
    
    const nextSegment = findNextSegment(state.currentSegmentId);
    if (!nextSegment) return;
    
    const duration = parseDurationToSeconds(nextSegment.duration);
    const newState = {
      ...state,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(nextSegment.id),
      isController: true
    };
    
    setState(newState);
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    broadcastState({
      action: 'forward',
      isPlaying: state.isPlaying,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration
    });
    
    console.log('📺 Simple: Forward to:', nextSegment.id);
  }, [state, findNextSegment, parseDurationToSeconds, buildStatusMap, broadcastState]);

  const backward = useCallback(() => {
    if (!state.currentSegmentId) return;
    
    const prevSegment = findPrevSegment(state.currentSegmentId);
    if (!prevSegment) return;
    
    const duration = parseDurationToSeconds(prevSegment.duration);
    const newState = {
      ...state,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(prevSegment.id),
      isController: true
    };
    
    setState(newState);
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    broadcastState({
      action: 'backward',
      isPlaying: state.isPlaying,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration
    });
    
    console.log('📺 Simple: Backward to:', prevSegment.id);
  }, [state, findPrevSegment, parseDurationToSeconds, buildStatusMap, broadcastState]);

  const reset = useCallback(() => {
    const newState = {
      isPlaying: false,
      currentSegmentId: null,
      timeRemaining: 0,
      currentItemStatuses: {},
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    stopTimer();
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    broadcastState({
      action: 'reset',
      isPlaying: false,
      currentSegmentId: null,
      timeRemaining: 0
    });
    
    console.log('📺 Simple: Reset called');
  }, [userId, stopTimer, broadcastState]);

  const jumpToSegment = useCallback((segmentId: string) => {
    const segment = items.find(item => item.id === segmentId);
    if (!segment) return;
    
    const duration = parseDurationToSeconds(segment.duration);
    const newState = {
      ...state,
      currentSegmentId: segmentId,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(segmentId),
      isController: true
    };
    
    setState(newState);
    
    // Save to database
    saveShowcallerState({
      isPlaying: newState.isPlaying,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining,
      playbackStartTime: null,
      lastUpdate: newState.lastUpdate,
      controllerId: newState.controllerId
    });
    
    broadcastState({
      action: 'jump',
      isPlaying: state.isPlaying,
      currentSegmentId: segmentId,
      timeRemaining: duration
    });
    
    console.log('📺 Simple: Jump to:', segmentId);
  }, [items, parseDurationToSeconds, buildStatusMap, state, broadcastState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    // State
    isPlaying: state.isPlaying,
    currentSegmentId: state.currentSegmentId,
    timeRemaining: state.timeRemaining,
    isController: state.isController,
    isConnected,
    
    // Status functions
    getItemVisualStatus: useCallback((itemId: string) => {
      return state.currentItemStatuses[itemId] || 'upcoming';
    }, [state.currentItemStatuses]),
    
    // Controls (only work if controller)
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment
  };
};