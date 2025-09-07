import { useEffect, useCallback, useRef, useState } from 'react';
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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
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

  // Broadcast showcaller state with precise timing
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

  // Enhanced timing broadcast with precise playback start time
  const broadcastTimingUpdate = useCallback((timeRemaining: number, currentSegmentId: string | null, isPlaying: boolean, playbackStartTime: number | null) => {
    if (!rundownId || !user?.id || !enabled || !isPlaying || !currentSegmentId || !playbackStartTime) return;

    const timingState: ShowcallerBroadcastState = {
      action: 'timing',
      rundownId,
      userId: user.id,
      timestamp: Date.now(),
      isPlaying,
      currentSegmentId,
      timeRemaining,
      playbackStartTime, // Include precise timing base
      isController: true
    };

    console.log('📺 Broadcasting timing sync:', timingState);
    showcallerBroadcast.broadcastState(timingState);
  }, [rundownId, user?.id, enabled]);

  // Set up broadcast subscription
  useEffect(() => {
    if (!rundownId || !enabled) {
      setIsConnected(false);
      return;
    }

    console.log('📺 Setting up showcaller broadcast sync:', rundownId);

    const unsubscribe = showcallerBroadcast.subscribeToShowcallerBroadcasts(
      rundownId,
      handleBroadcast,
      user?.id || ''
    );

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const connected = showcallerBroadcast.isChannelConnected(rundownId);
      setIsConnected(connected);
      
      if (!connected) {
        console.warn('📺 ⚠️ Showcaller broadcast channel not connected:', rundownId);
      }
    }, 2000);

    return () => {
      console.log('📺 Cleaning up showcaller broadcast sync');
      clearInterval(statusInterval);
      unsubscribe();
      setIsConnected(false);
    };
  }, [rundownId, enabled, handleBroadcast, user?.id]);

  return {
    broadcastState,
    broadcastTimingUpdate,
    isConnected
  };
};
