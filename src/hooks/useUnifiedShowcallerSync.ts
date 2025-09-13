/**
 * Unified Showcaller Sync
 * 
 * Consolidates all showcaller systems into a single, reliable hook that handles:
 * - Position persistence across refreshes
 * - Real-time synchronization between users
 * - Playback controls and timing
 * - Visual status management
 * - Broadcast coordination
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { supabase } from '@/integrations/supabase/client';
import { isFloated } from '@/utils/rundownCalculations';

interface ShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  isController: boolean;
  controllerId: string | null;
  lastUpdate: string;
  playbackStartTime: number | null;
}

interface UseUnifiedShowcallerSyncProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useUnifiedShowcallerSync = ({
  items,
  rundownId,
  userId,
  setShowcallerUpdate
}: UseUnifiedShowcallerSyncProps) => {
  const [state, setState] = useState<ShowcallerState>({
    isPlaying: false,
    currentSegmentId: null,
    timeRemaining: 0,
    isController: false,
    controllerId: null,
    lastUpdate: new Date().toISOString(),
    playbackStartTime: null
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);
  
  // Refs for coordination
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const broadcastChannelRef = useRef<any>(null);
  const ownUpdateTimestampRef = useRef<string>('');
  const playbackIntervalRef = useRef<NodeJS.Timeout>();
  
  // Create state signature for change detection
  const createStateSignature = useCallback((targetState: ShowcallerState) => {
    return JSON.stringify({
      currentSegmentId: targetState.currentSegmentId,
      isPlaying: targetState.isPlaying,
      timeRemaining: targetState.timeRemaining,
      isController: targetState.isController,
      controllerId: targetState.controllerId
    });
  }, []);
  
  // Get first valid segment
  const getFirstSegment = useCallback(() => {
    return items.find(item => item.type === 'regular' && !isFloated(item)) || null;
  }, [items]);
  
  // Parse duration to seconds
  const parseDurationToSeconds = useCallback((duration: string) => {
    if (!duration) return 0;
    const parts = duration.split(':').map(n => Number(n) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }, []);
  
  // Save showcaller state to database
  const saveShowcallerState = useCallback(async (stateToSave: ShowcallerState) => {
    if (!rundownId || !stateToSave.currentSegmentId) return;
    
    const signature = createStateSignature(stateToSave);
    if (signature === lastSavedStateRef.current) return;
    
    try {
      const showcallerState = {
        currentSegmentId: stateToSave.currentSegmentId,
        isPlaying: stateToSave.isPlaying,
        timeRemaining: stateToSave.timeRemaining,
        isController: stateToSave.isController,
        controllerId: stateToSave.controllerId,
        lastUpdate: stateToSave.lastUpdate,
        playbackStartTime: stateToSave.playbackStartTime
      };
      
      const { error } = await supabase
        .from('rundowns')
        .update({ showcaller_state: showcallerState })
        .eq('id', rundownId);
      
      if (!error) {
        lastSavedStateRef.current = signature;
        console.log('📺 Unified: Saved showcaller state:', stateToSave.currentSegmentId);
      }
    } catch (error) {
      console.error('Failed to save showcaller state:', error);
    }
  }, [rundownId, createStateSignature]);
  
  // Schedule save with debouncing
  const scheduleSave = useCallback((stateToSave: ShowcallerState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveShowcallerState(stateToSave);
    }, 500);
  }, [saveShowcallerState]);
  
  // Broadcast state to other users
  const broadcastState = useCallback((action: string, newState: ShowcallerState) => {
    if (!broadcastChannelRef.current || !userId) return;
    
    const timestamp = new Date().toISOString();
    ownUpdateTimestampRef.current = timestamp;
    
    const broadcast = {
      action,
      ...newState,
      userId,
      lastUpdate: timestamp,
      rundownId
    };
    
    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'showcaller_update',
      payload: broadcast
    });
    
    console.log('📺 Unified: Broadcasted state:', action, newState.currentSegmentId);
  }, [userId, rundownId]);
  
  // Load initial state from database
  const loadInitialState = useCallback(async () => {
    if (!rundownId) return;
    
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .single();
      
      if (error || !data?.showcaller_state) {
        // Initialize to first segment
        const firstSegment = getFirstSegment();
        if (firstSegment) {
          const initialState: ShowcallerState = {
            isPlaying: false,
            currentSegmentId: firstSegment.id,
            timeRemaining: parseDurationToSeconds(firstSegment.duration),
            isController: false,
            controllerId: null,
            lastUpdate: new Date().toISOString(),
            playbackStartTime: null
          };
          
          setState(initialState);
          saveShowcallerState(initialState);
          console.log('📺 Unified: Initialized to first segment:', firstSegment.id);
        }
      } else {
        // Load saved state
        const savedState = data.showcaller_state;
        const loadedState: ShowcallerState = {
          isPlaying: savedState.isPlaying || false,
          currentSegmentId: savedState.currentSegmentId || null,
          timeRemaining: savedState.timeRemaining || 0,
          isController: savedState.isController || false,
          controllerId: savedState.controllerId || null,
          lastUpdate: savedState.lastUpdate || new Date().toISOString(),
          playbackStartTime: savedState.playbackStartTime || null
        };
        
        // Validate that the segment still exists
        const segmentExists = items.find(item => item.id === loadedState.currentSegmentId);
        if (!segmentExists) {
          const firstSegment = getFirstSegment();
          if (firstSegment) {
            loadedState.currentSegmentId = firstSegment.id;
            loadedState.timeRemaining = parseDurationToSeconds(firstSegment.duration);
          }
        }
        
        setState(loadedState);
        console.log('📺 Unified: Loaded saved state:', loadedState.currentSegmentId);
      }
      
      setHasLoadedInitialState(true);
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Failed to load showcaller state:', error);
      setIsInitialized(true);
    }
  }, [rundownId, getFirstSegment, parseDurationToSeconds, items, saveShowcallerState]);
  
  // Playback controls
  const play = useCallback((selectedSegmentId?: string) => {
    const targetId = selectedSegmentId || state.currentSegmentId;
    const targetSegment = items.find(item => item.id === targetId);
    
    if (!targetSegment) return;
    
    const newState: ShowcallerState = {
      ...state,
      isPlaying: true,
      currentSegmentId: targetId,
      timeRemaining: state.timeRemaining || parseDurationToSeconds(targetSegment.duration),
      isController: true,
      controllerId: userId || null,
      lastUpdate: new Date().toISOString(),
      playbackStartTime: Date.now()
    };
    
    setState(newState);
    broadcastState('play', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Play:', targetId);
  }, [state, items, parseDurationToSeconds, userId, broadcastState, scheduleSave]);
  
  const pause = useCallback(() => {
    const newState: ShowcallerState = {
      ...state,
      isPlaying: false,
      lastUpdate: new Date().toISOString(),
      playbackStartTime: null
    };
    
    setState(newState);
    broadcastState('pause', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Pause');
  }, [state, broadcastState, scheduleSave]);
  
  const forward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === state.currentSegmentId);
    const nextItem = items.slice(currentIndex + 1).find(item => item.type === 'regular' && !isFloated(item));
    
    if (!nextItem) return;
    
    const newState: ShowcallerState = {
      ...state,
      currentSegmentId: nextItem.id,
      timeRemaining: parseDurationToSeconds(nextItem.duration),
      lastUpdate: new Date().toISOString(),
      playbackStartTime: state.isPlaying ? Date.now() : null
    };
    
    setState(newState);
    broadcastState('forward', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Forward to:', nextItem.id);
  }, [state, items, parseDurationToSeconds, broadcastState, scheduleSave]);
  
  const backward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === state.currentSegmentId);
    const prevItem = items.slice(0, currentIndex).reverse().find(item => item.type === 'regular' && !isFloated(item));
    
    if (!prevItem) return;
    
    const newState: ShowcallerState = {
      ...state,
      currentSegmentId: prevItem.id,
      timeRemaining: parseDurationToSeconds(prevItem.duration),
      lastUpdate: new Date().toISOString(),
      playbackStartTime: state.isPlaying ? Date.now() : null
    };
    
    setState(newState);
    broadcastState('backward', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Backward to:', prevItem.id);
  }, [state, items, parseDurationToSeconds, broadcastState, scheduleSave]);
  
  const reset = useCallback(() => {
    const firstSegment = getFirstSegment();
    if (!firstSegment) return;
    
    const newState: ShowcallerState = {
      ...state,
      isPlaying: false,
      currentSegmentId: firstSegment.id,
      timeRemaining: parseDurationToSeconds(firstSegment.duration),
      lastUpdate: new Date().toISOString(),
      playbackStartTime: null
    };
    
    setState(newState);
    broadcastState('reset', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Reset to:', firstSegment.id);
  }, [state, getFirstSegment, parseDurationToSeconds, broadcastState, scheduleSave]);
  
  const jumpToSegment = useCallback((segmentId: string) => {
    const segment = items.find(item => item.id === segmentId);
    if (!segment) return;
    
    const newState: ShowcallerState = {
      ...state,
      currentSegmentId: segmentId,
      timeRemaining: parseDurationToSeconds(segment.duration),
      lastUpdate: new Date().toISOString(),
      playbackStartTime: state.isPlaying ? Date.now() : null
    };
    
    setState(newState);
    broadcastState('jump', newState);
    scheduleSave(newState);
    
    console.log('📺 Unified: Jump to:', segmentId);
  }, [state, items, parseDurationToSeconds, broadcastState, scheduleSave]);
  
  // Get visual status for items
  const getItemVisualStatus = useCallback((itemId: string) => {
    if (!state.currentSegmentId) return '';
    
    const currentIndex = items.findIndex(item => item.id === state.currentSegmentId);
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex < 0 || currentIndex < 0) return '';
    
    if (itemIndex < currentIndex) return 'completed';
    if (itemIndex === currentIndex) return state.isPlaying ? 'current-playing' : 'current';
    return '';
  }, [state.currentSegmentId, state.isPlaying, items]);
  
  // Setup broadcast channel
  useEffect(() => {
    if (!rundownId) return;
    
    const channel = supabase.channel(`showcaller-${rundownId}`)
      .on('broadcast', { event: 'showcaller_update' }, (payload) => {
        const data = payload.payload;
        
        // Skip our own updates
        if (data.userId === userId || data.lastUpdate === ownUpdateTimestampRef.current) {
          return;
        }
        
        console.log('📺 Unified: Received broadcast:', data.action, data.currentSegmentId);
        
        // Apply external state
        setState({
          isPlaying: data.isPlaying || false,
          currentSegmentId: data.currentSegmentId || null,
          timeRemaining: data.timeRemaining || 0,
          isController: data.isController || false,
          controllerId: data.controllerId || null,
          lastUpdate: data.lastUpdate || new Date().toISOString(),
          playbackStartTime: data.playbackStartTime || null
        });
        
        if (setShowcallerUpdate) {
          setShowcallerUpdate(true);
          setTimeout(() => setShowcallerUpdate(false), 1000);
        }
      })
      .subscribe();
    
    broadcastChannelRef.current = channel;
    
    return () => {
      channel.unsubscribe();
    };
  }, [rundownId, userId, setShowcallerUpdate]);
  
  // Playback timer
  useEffect(() => {
    if (!state.isPlaying || !state.playbackStartTime) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = undefined;
      }
      return;
    }
    
    playbackIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.isPlaying || !prev.playbackStartTime) return prev;
        
        const elapsed = Math.floor((Date.now() - prev.playbackStartTime) / 1000);
        const newTimeRemaining = Math.max(0, prev.timeRemaining - elapsed);
        
        // Auto-advance if time runs out
        if (newTimeRemaining === 0) {
          const currentIndex = items.findIndex(item => item.id === prev.currentSegmentId);
          const nextItem = items.slice(currentIndex + 1).find(item => item.type === 'regular' && !isFloated(item));
          
          if (nextItem) {
            const newState = {
              ...prev,
              currentSegmentId: nextItem.id,
              timeRemaining: parseDurationToSeconds(nextItem.duration),
              playbackStartTime: Date.now(),
              lastUpdate: new Date().toISOString()
            };
            
            broadcastState('auto-advance', newState);
            scheduleSave(newState);
            
            return newState;
          } else {
            // End of rundown
            const endState = {
              ...prev,
              isPlaying: false,
              playbackStartTime: null,
              lastUpdate: new Date().toISOString()
            };
            
            broadcastState('end', endState);
            scheduleSave(endState);
            
            return endState;
          }
        }
        
        return {
          ...prev,
          timeRemaining: newTimeRemaining,
          playbackStartTime: prev.playbackStartTime // Reset elapsed calculation
        };
      });
    }, 1000);
    
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [state.isPlaying, state.playbackStartTime, items, parseDurationToSeconds, broadcastState, scheduleSave]);
  
  // Initialize when rundown is ready
  useEffect(() => {
    if (rundownId && items.length > 0 && !isInitialized) {
      loadInitialState();
    }
  }, [rundownId, items.length, isInitialized, loadInitialState]);
  
  return {
    // State
    isPlaying: state.isPlaying,
    currentSegmentId: state.currentSegmentId,
    timeRemaining: state.timeRemaining,
    isController: state.isController,
    controllerId: state.controllerId,
    isInitialized,
    hasLoadedInitialState,
    
    // Actions
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    
    // Helpers
    getItemVisualStatus
  };
};