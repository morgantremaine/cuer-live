import { useState, useEffect, useRef, useCallback } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';

interface UseTeleprompterConnectionHealthProps {
  rundownId: string;
  enabled?: boolean;
  onSilentRefresh: () => Promise<void>;
  staleThresholdMs?: number; // How long without broadcasts before considered stale
  healthCheckIntervalMs?: number; // How often to check health
}

interface ConnectionHealthState {
  showConnectionWarning: boolean;
  consecutiveFailures: number;
  lastSuccessfulRecovery: number | null;
}

export const useTeleprompterConnectionHealth = ({
  rundownId,
  enabled = true,
  onSilentRefresh,
  staleThresholdMs = 60000, // 60 seconds default
  healthCheckIntervalMs = 30000 // 30 seconds default
}: UseTeleprompterConnectionHealthProps) => {
  const [state, setState] = useState<ConnectionHealthState>({
    showConnectionWarning: false,
    consecutiveFailures: 0,
    lastSuccessfulRecovery: null
  });
  
  const isRecoveringRef = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastManualBroadcastRef = useRef<number>(Date.now()); // Track when we last received any broadcast
  
  // Mark that we received a broadcast (called from Teleprompter.tsx)
  const markBroadcastReceived = useCallback(() => {
    lastManualBroadcastRef.current = Date.now();
    
    // If we had a warning showing, clear it since we're receiving broadcasts again
    if (state.showConnectionWarning) {
      console.log('📺 Teleprompter: Connection recovered - clearing warning');
      setState(prev => ({
        ...prev,
        showConnectionWarning: false,
        consecutiveFailures: 0,
        lastSuccessfulRecovery: Date.now()
      }));
    }
  }, [state.showConnectionWarning]);

  // Attempt silent recovery
  const attemptSilentRecovery = useCallback(async () => {
    if (isRecoveringRef.current) {
      console.log('📺 Teleprompter: Already recovering, skipping...');
      return;
    }
    
    isRecoveringRef.current = true;
    
    try {
      console.warn('📺 Teleprompter: Stale connection detected, attempting silent recovery...');
      
      // Step 1: Force reconnect the cellBroadcast channel
      await cellBroadcast.forceReconnect(rundownId);
      
      // Step 2: Wait a bit for reconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Fetch fresh data silently
      await onSilentRefresh();
      
      // Step 4: Check if we're now receiving broadcasts
      const isChannelConnected = cellBroadcast.isChannelConnected(rundownId);
      
      if (isChannelConnected) {
        console.log('📺 Teleprompter: Silent recovery successful');
        setState(prev => ({
          showConnectionWarning: false,
          consecutiveFailures: 0,
          lastSuccessfulRecovery: Date.now()
        }));
        lastManualBroadcastRef.current = Date.now();
      } else {
        // Recovery failed, increment counter
        setState(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          console.warn(`📺 Teleprompter: Recovery attempt ${newFailures} failed`);
          
          // Show warning after 3 consecutive failures (but NEVER force refresh)
          return {
            ...prev,
            consecutiveFailures: newFailures,
            showConnectionWarning: newFailures >= 3
          };
        });
      }
    } catch (error) {
      console.error('📺 Teleprompter: Silent recovery error:', error);
      setState(prev => ({
        ...prev,
        consecutiveFailures: prev.consecutiveFailures + 1,
        showConnectionWarning: prev.consecutiveFailures >= 2
      }));
    } finally {
      isRecoveringRef.current = false;
    }
  }, [rundownId, onSilentRefresh]);

  // Health check effect
  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    const performHealthCheck = async () => {
      // Check if channel reports as connected
      const isChannelConnected = cellBroadcast.isChannelConnected(rundownId);
      
      // Check if we've received broadcasts recently
      const lastBroadcast = cellBroadcast.getLastBroadcastTime(rundownId);
      const manualLastBroadcast = lastManualBroadcastRef.current;
      const mostRecentBroadcast = Math.max(lastBroadcast, manualLastBroadcast);
      const timeSinceLastBroadcast = Date.now() - mostRecentBroadcast;
      
      // Stale = channel says connected but no broadcasts for staleThresholdMs
      const isStale = isChannelConnected && timeSinceLastBroadcast > staleThresholdMs;
      
      if (isStale) {
        console.warn(`📺 Teleprompter health check: Connection stale (${Math.round(timeSinceLastBroadcast/1000)}s since last broadcast)`);
        await attemptSilentRecovery();
      } else if (!isChannelConnected) {
        console.warn('📺 Teleprompter health check: Channel disconnected');
        await attemptSilentRecovery();
      }
    };
    
    // Run initial check after short delay
    const initialTimeout = setTimeout(performHealthCheck, 5000);
    
    // Set up periodic health checks
    healthCheckIntervalRef.current = setInterval(performHealthCheck, healthCheckIntervalMs);
    
    return () => {
      clearTimeout(initialTimeout);
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [enabled, rundownId, staleThresholdMs, healthCheckIntervalMs, attemptSilentRecovery]);

  return {
    showConnectionWarning: state.showConnectionWarning,
    consecutiveFailures: state.consecutiveFailures,
    markBroadcastReceived
  };
};
