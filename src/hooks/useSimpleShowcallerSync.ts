import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';
import { useShowcallerBroadcastSync } from './useShowcallerBroadcastSync';
import { ShowcallerBroadcastState } from '@/utils/showcallerBroadcast';
import { supabase } from '@/integrations/supabase/client';

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
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useSimpleShowcallerSync = ({
  items,
  rundownId,
  userId,
  setShowcallerUpdate
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
  const hasLoadedInitialState = useRef<boolean>(false);
  const isLoadingInitialState = useRef<boolean>(false);
  const lastActionTimeRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef<boolean>(false);
  const immediateSave = useRef<(s: SimpleShowcallerState) => void>(() => {});
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
    
    // Broadcast immediately
    broadcastState({
      action: 'play',
      isPlaying: true,
      currentSegmentId: targetSegmentId,
      timeRemaining: duration
    });
    
    // Persist immediately to avoid losing state on quick refresh
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
  }, [state.currentSegmentId, items, parseDurationToSeconds, buildStatusMap, userId, startControllerTimer, broadcastState]);

  const pause = useCallback(() => {
    console.log('📺 Simple: Pause called');
    
    const newState = { 
      ...state, 
      isPlaying: false, 
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    setState(newState);
    stopTimer();
    
    broadcastState({
      action: 'pause',
      isPlaying: false,
      currentSegmentId: newState.currentSegmentId,
      timeRemaining: newState.timeRemaining
    });
    
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
  }, [state, userId, stopTimer, broadcastState]);

  const forward = useCallback(() => {
    if (!state.currentSegmentId) return;
    
    const nextSegment = findNextSegment(state.currentSegmentId);
    if (!nextSegment) return;
    
    // Prevent rapid successive calls within 300ms to fix double-jump issue
    const now = Date.now();
    if (lastActionTimeRef.current && (now - lastActionTimeRef.current) < 300) {
      console.log('📺 Simple: Forward ignored - too rapid, preventing double-jump');
      return;
    }
    lastActionTimeRef.current = now;
    
    const duration = parseDurationToSeconds(nextSegment.duration);
    const newState = {
      ...state,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(nextSegment.id),
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    
    broadcastState({
      action: 'forward',
      isPlaying: state.isPlaying,
      currentSegmentId: nextSegment.id,
      timeRemaining: duration
    });
    
    // Persist immediately
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
    
    console.log('📺 Simple: Forward to:', nextSegment.id);
  }, [state, findNextSegment, parseDurationToSeconds, buildStatusMap, broadcastState]);

  const backward = useCallback(() => {
    if (!state.currentSegmentId) return;
    
    const prevSegment = findPrevSegment(state.currentSegmentId);
    if (!prevSegment) return;
    
    // Prevent rapid successive calls within 300ms to fix double-jump issue
    const now = Date.now();
    if (lastActionTimeRef.current && (now - lastActionTimeRef.current) < 300) {
      console.log('📺 Simple: Backward ignored - too rapid, preventing double-jump');
      return;
    }
    lastActionTimeRef.current = now;
    
    const duration = parseDurationToSeconds(prevSegment.duration);
    const newState = {
      ...state,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(prevSegment.id),
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    
    broadcastState({
      action: 'backward',
      isPlaying: state.isPlaying,
      currentSegmentId: prevSegment.id,
      timeRemaining: duration
    });
    
    // Persist immediately
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
    
    console.log('📺 Simple: Backward to:', prevSegment.id);
  }, [state, findPrevSegment, parseDurationToSeconds, buildStatusMap, broadcastState]);

  const reset = useCallback(() => {
    console.log('📺 Simple: Reset called');
    
    // FIXED: Ensure we always preserve a valid currentSegmentId during reset
    const targetSegmentId = state.currentSegmentId || items.find(item => item.type === 'regular' && !isFloated(item))?.id || null;
    const duration = targetSegmentId ? parseDurationToSeconds((items.find(i => i.id === targetSegmentId)?.duration) || '00:00') : 0;
    const newState = {
      ...state,
      isPlaying: false,
      currentSegmentId: targetSegmentId, // Never allow null if we have items
      timeRemaining: duration,
      currentItemStatuses: targetSegmentId ? buildStatusMap(targetSegmentId) : {},
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    stopTimer();
    
    broadcastState({
      action: 'reset',
      isPlaying: false,
      currentSegmentId: targetSegmentId || state.currentSegmentId || null,
      timeRemaining: duration
    });
    
    // Persist immediately
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
  }, [userId, stopTimer, broadcastState, state, items, parseDurationToSeconds, buildStatusMap]);

  const jumpToSegment = useCallback((segmentId: string) => {
    const segment = items.find(item => item.id === segmentId);
    if (!segment) return;
    
    const duration = parseDurationToSeconds(segment.duration);
    const newState = {
      ...state,
      currentSegmentId: segmentId,
      timeRemaining: duration,
      currentItemStatuses: buildStatusMap(segmentId),
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString()
    };
    
    setState(newState);
    
    broadcastState({
      action: 'jump',
      isPlaying: state.isPlaying,
      currentSegmentId: segmentId,
      timeRemaining: duration
    });
    
    // Persist immediately
    skipNextSaveRef.current = true;
    immediateSave.current(newState);
    
    console.log('📺 Simple: Jump to:', segmentId);
  }, [items, parseDurationToSeconds, buildStatusMap, state, broadcastState]);

  // Handle when current segment is deleted from items
  useEffect(() => {
    if (!state.currentSegmentId || !hasLoadedInitialState.current) {
      return;
    }

    // Check if current segment still exists in items
    const currentItemExists = items.find(item => item.id === state.currentSegmentId);
    
    if (!currentItemExists) {
      console.log('📺 Simple: Current segment deleted, finding next available segment');
      
      // Find the next available segment (first regular, non-floated item)
      const nextSegment = items.find(item => item.type === 'regular' && !isFloated(item));
      
      if (nextSegment) {
        console.log('📺 Simple: Moving showcaller to next available segment:', nextSegment.id);
        
        const duration = parseDurationToSeconds(nextSegment.duration);
        const newState = {
          ...state,
          currentSegmentId: nextSegment.id,
          timeRemaining: state.isPlaying ? duration : 0, // Preserve playing state
          currentItemStatuses: buildStatusMap(nextSegment.id),
          lastUpdate: new Date().toISOString()
        };
        
        setState(newState);
        
        // Broadcast the change if we're the controller
        if (state.isController) {
          broadcastState({
            action: 'jump',
            isPlaying: state.isPlaying,
            currentSegmentId: nextSegment.id,
            timeRemaining: newState.timeRemaining
          });
        }
        
        // Persist immediately
        skipNextSaveRef.current = true;
        immediateSave.current(newState);
      } else {
        console.log('📺 Simple: No available segments, resetting showcaller');
        
        // No segments available, reset to initial state
        const resetState = {
          ...state,
          isPlaying: false,
          currentSegmentId: null,
          timeRemaining: 0,
          currentItemStatuses: {},
          lastUpdate: new Date().toISOString()
        };
        
        setState(resetState);
        stopTimer();
        
        if (state.isController) {
          broadcastState({
            action: 'reset',
            isPlaying: false,
            currentSegmentId: null,
            timeRemaining: 0
          });
        }
        
        skipNextSaveRef.current = true;
        immediateSave.current(resetState);
      }
    }
  }, [items, state.currentSegmentId, state.isPlaying, state.isController, hasLoadedInitialState.current, parseDurationToSeconds, buildStatusMap, broadcastState, stopTimer]);

  // Load initial showcaller state from database
  useEffect(() => {
    if (!rundownId || hasLoadedInitialState.current || isLoadingInitialState.current) {
      return;
    }

    const loadInitialState = async () => {
      isLoadingInitialState.current = true;
      
      try {
        console.log('📺 Simple: Loading initial showcaller state for rundown:', rundownId);
        
        const { data, error } = await supabase
          .from('rundowns')
          .select('showcaller_state')
          .eq('id', rundownId)
          .maybeSingle();

        if (error) {
          console.error('📺 Simple: Error loading initial state:', error);
          hasLoadedInitialState.current = true;
          return;
        }

        if (data?.showcaller_state) {
          console.log('📺 Simple: Found existing showcaller state:', data.showcaller_state);
          
          // Apply the loaded state
          const loadedState = data.showcaller_state;
          
          // Try multiple possible field names for currentSegmentId (backward compatibility)
          const currentSegmentId = loadedState.currentSegmentId || 
                                  loadedState.current_segment_id || 
                                  loadedState.currentSegment;
          
          // DEBUG: Log the actual loaded state structure
          console.log('📺 DEBUG: Loaded state structure:', {
            hasCurrentSegmentId: !!currentSegmentId,
            currentSegmentId: currentSegmentId,
            loadedStateKeys: Object.keys(loadedState),
            fullLoadedState: loadedState
          });
          
          // CRITICAL: Always show the showcaller indicator where it was last positioned
          // Even if currentSegmentId is missing, try to preserve any existing position
          if (currentSegmentId) {
            console.log('📺 Simple: Restoring showcaller to last position:', currentSegmentId);
            
            // Verify this item still exists in the rundown
            const itemExists = items.find(item => item.id === currentSegmentId);
            const finalSegmentId = itemExists ? currentSegmentId : items.find(item => item.type === 'regular' && !isFloated(item))?.id;
            
            if (finalSegmentId) {
              setState({
                isPlaying: false, // Always start paused when loading
                currentSegmentId: finalSegmentId,
                timeRemaining: 0, // Reset time when loading
                currentItemStatuses: buildStatusMap(finalSegmentId),
                isController: false,
                controllerId: loadedState.controllerId || null,
                lastUpdate: loadedState.lastUpdate || new Date().toISOString()
              });
              
              console.log('📺 Simple: Successfully restored showcaller position to:', finalSegmentId);
            } else {
              console.warn('📺 Simple: No valid items found, cannot restore showcaller');
            }
          } else {
            console.log('📺 Simple: No current segment in saved state, initializing to first item');
            console.log('📺 DEBUG: LoadedState.currentSegmentId was:', currentSegmentId, 'type:', typeof currentSegmentId);
            
            // Initialize to first item when there's no saved position
            const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
            if (firstSegment) {
              setState({
                isPlaying: false,
                currentSegmentId: firstSegment.id,
                timeRemaining: 0,
                currentItemStatuses: buildStatusMap(firstSegment.id),
                isController: false,
                controllerId: loadedState.controllerId || null,
                lastUpdate: loadedState.lastUpdate || new Date().toISOString()
              });
              
              console.log('📺 Simple: Initialized showcaller to first item:', firstSegment.id);
            } else {
              console.warn('📺 Simple: No valid items found for initialization');
            }
          }
        } else {
          console.log('📺 Simple: No saved showcaller state, initializing to first item');
          // Initialize to first item when no saved state exists at all
          const firstSegment = items.find(item => item.type === 'regular' && !isFloated(item));
          if (firstSegment) {
            setState({
              isPlaying: false,
              currentSegmentId: firstSegment.id,
              timeRemaining: 0,
              currentItemStatuses: buildStatusMap(firstSegment.id),
              isController: false,
              controllerId: null,
              lastUpdate: new Date().toISOString()
            });
            
            console.log('📺 Simple: Initialized showcaller to first item (no saved state):', firstSegment.id);
          } else {
            console.warn('📺 Simple: No valid items found for initialization (no saved state)');
          }
        }
        // Only skip the next save if we loaded any existing showcaller state (including "no position")
        skipNextSaveRef.current = !!(data?.showcaller_state);
        hasLoadedInitialState.current = true;
      } catch (error) {
        console.error('📺 Simple: Error loading initial state:', error);
        hasLoadedInitialState.current = true;
      } finally {
        isLoadingInitialState.current = false;
      }
    };

    // Only load when we have items to avoid race conditions
    if (items.length > 0) {
      loadInitialState();
    }
  }, [rundownId, items, buildStatusMap]);

  // Save showcaller state to database without updating rundown's updated_at timestamp
  const saveShowcallerState = useCallback(async (stateToSave: SimpleShowcallerState) => {
    if (!rundownId || !hasLoadedInitialState.current) return;
    
    try {
      // Signal that this is a showcaller operation to prevent false change detection
      if (setShowcallerUpdate) {
        setShowcallerUpdate(true);
      }
      
      console.log('📺 Simple: Saving showcaller state silently:', stateToSave.currentSegmentId || 'no position');
      
      const showcallerState = {
        currentSegmentId: stateToSave.currentSegmentId, // Allow null for "no position"
        isPlaying: stateToSave.isPlaying,
        timeRemaining: stateToSave.timeRemaining,
        controllerId: stateToSave.controllerId,
        lastUpdate: stateToSave.lastUpdate,
        currentItemStatuses: stateToSave.currentItemStatuses
      };

      // Use the silent update function to avoid updating the rundown's updated_at timestamp
      const { error } = await supabase.rpc('update_showcaller_state_silent', {
        rundown_uuid: rundownId,
        new_showcaller_state: showcallerState
      });

      if (error) {
        console.error('📺 Simple: Error saving showcaller state:', error);
      } else {
        console.log('📺 Simple: Successfully saved showcaller state without updating rundown timestamp');
      }
    } catch (error) {
      console.error('📺 Simple: Error saving showcaller state:', error);
    } finally {
      // Clear the showcaller operation flag after a delay
      if (setShowcallerUpdate) {
        setTimeout(() => setShowcallerUpdate(false), 1000);
      }
    }
  }, [rundownId, setShowcallerUpdate]);

  // Keep immediate save ref in sync
  useEffect(() => {
    immediateSave.current = saveShowcallerState;
  }, [saveShowcallerState]);

  // Auto-save state changes (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!hasLoadedInitialState.current) return;
    // Skip the first save after initial load
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    // Debounce saves to prevent too frequent updates
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerState(state);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, saveShowcallerState]);

  // Flush pending save on unload to prevent losing state on quick refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      try { saveShowcallerState(state); } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, saveShowcallerState]);

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