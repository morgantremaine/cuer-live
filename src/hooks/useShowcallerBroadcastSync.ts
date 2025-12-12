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
  const { user, tokenReady } = useAuth();
  const callbackRef = useRef(onBroadcastReceived);
  const lastBroadcastRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  callbackRef.current = onBroadcastReceived;

  const handleBroadcast = useCallback((state: ShowcallerBroadcastState) => {
    const now = Date.now();
    
    if (now - lastBroadcastRef.current < 100) {
      console.log('📺 Throttling showcaller broadcast');
      return;
    }
    
    lastBroadcastRef.current = now;
    callbackRef.current(state);
  }, []);

  const broadcastState = useCallback((state: Omit<ShowcallerBroadcastState, 'rundownId' | 'userId' | 'timestamp'>) => {
    if (!rundownId || !user?.id || !enabled) return;

    const fullState: ShowcallerBroadcastState = {
      ...state,
      rundownId,
      userId: user.id,
      timestamp: Date.now()
    };

    const key = `${state.action}-${state.currentSegmentId}-${state.isPlaying}`;
    const now = Date.now();
    if (lastBroadcastRef.current > 0 && (now - lastBroadcastRef.current < 100)) {
      console.log('📺 Deduplicating showcase broadcast:', key);
      return;
    }
    lastBroadcastRef.current = now;

    console.log('📺 Broadcasting showcaller state:', state.action, fullState);
    showcallerBroadcast.broadcastState(fullState);
  }, [rundownId, user?.id, enabled]);

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
      playbackStartTime,
      isController: true
    };

    console.log('📺 Broadcasting timing sync:', timingState);
    showcallerBroadcast.broadcastState(timingState);
  }, [rundownId, user?.id, enabled]);

  useEffect(() => {
    if (!rundownId || !enabled || !user || !tokenReady) {
      setIsConnected(false);
      return;
    }

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
    }, 10000);

    // NOTE: Recovery handled by nuclear reset in useConsolidatedRealtimeRundown

    return () => {
      console.log('📺 Cleaning up showcaller broadcast sync');
      clearInterval(statusInterval);
      unsubscribe();
      setIsConnected(false);
    };
  }, [rundownId, enabled, handleBroadcast, user?.id, tokenReady]);

  return {
    broadcastState,
    broadcastTimingUpdate,
    isConnected
  };
};
