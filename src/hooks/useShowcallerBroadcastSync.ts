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

    // Prevent duplicate broadcasts within 100ms
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

    // Check connection status more frequently
    const statusInterval = setInterval(() => {
      const connected = showcallerBroadcast.isChannelConnected(rundownId);
      const currentStatus = showcallerBroadcast.getConnectionStatus(rundownId);
      
      setIsConnected(connected);
      
      if (!connected) {
        console.warn('📺 ⚠️ Showcaller broadcast channel not connected:', rundownId, 'Status:', currentStatus);
      }
    }, 3000); // Check every 3 seconds

    // Monitor window focus to ensure connection stays active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // When tab becomes visible, check connection after a brief delay
        setTimeout(() => {
          const connected = showcallerBroadcast.isChannelConnected(rundownId);
          if (!connected) {
            console.log('📺 🔄 Tab visible but showcaller not connected, may need reconnection');
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('📺 Cleaning up showcaller broadcast sync');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
