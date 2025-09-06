import { useEffect, useCallback, useRef } from 'react';
import { showcallerBroadcast, ShowcallerBroadcastState } from '@/utils/showcallerBroadcast';
import { useAuth } from './useAuth';

interface UseShowcallerBroadcastSyncProps {
  rundownId: string | null;
  onBroadcastReceived: (state: ShowcallerBroadcastState) => void;
  enabled?: boolean;
}

export const useShowcallerBroadcastSync = ({
  rundownId,
  onBroadcastReceived,
  enabled = true
}: UseShowcallerBroadcastSyncProps) => {
  const { user } = useAuth();
  const callbackRef = useRef(onBroadcastReceived);
  const lastBroadcastRef = useRef<number>(0);
  
  // Keep callback updated
  callbackRef.current = onBroadcastReceived;

  // Throttled broadcast handler to prevent spam
  const handleBroadcast = useCallback((state: ShowcallerBroadcastState) => {
    const now = Date.now();
    
    // Throttle incoming broadcasts (max 10 per second)
    if (now - lastBroadcastRef.current < 100) {
      console.log('📺 Throttling showcaller broadcast');
      return;
    }
    
    lastBroadcastRef.current = now;
    callbackRef.current(state);
  }, []);

  // Broadcast showcaller state
  const broadcastState = useCallback((state: Omit<ShowcallerBroadcastState, 'rundownId' | 'userId' | 'timestamp'>) => {
    if (!rundownId || !user?.id || !enabled) return;

    const fullState: ShowcallerBroadcastState = {
      ...state,
      rundownId,
      userId: user.id,
      timestamp: Date.now()
    };

    console.log('📺 Broadcasting showcaller state:', state.action, fullState);
    showcallerBroadcast.broadcastState(fullState);
  }, [rundownId, user?.id, enabled]);

  // Periodic timing broadcast for live countdown sync
  const broadcastTimingUpdate = useCallback((timeRemaining: number, currentSegmentId: string | null, isPlaying: boolean) => {
    if (!rundownId || !user?.id || !enabled || !isPlaying || !currentSegmentId) return;

    const timingState: ShowcallerBroadcastState = {
      action: 'timing',
      rundownId,
      userId: user.id,
      timestamp: Date.now(),
      isPlaying,
      currentSegmentId,
      timeRemaining,
      isController: true
    };

    showcallerBroadcast.broadcastState(timingState);
  }, [rundownId, user?.id, enabled]);

  // Set up broadcast subscription
  useEffect(() => {
    if (!rundownId || !enabled) return;

    console.log('📺 Setting up showcaller broadcast sync:', rundownId);

    const unsubscribe = showcallerBroadcast.subscribeToShowcallerBroadcasts(
      rundownId,
      handleBroadcast,
      user?.id || ''
    );

    return () => {
      console.log('📺 Cleaning up showcaller broadcast sync');
      unsubscribe();
    };
  }, [rundownId, enabled, handleBroadcast, user?.id]);

  return {
    broadcastState,
    broadcastTimingUpdate,
    isConnected: enabled && !!rundownId
  };
};
