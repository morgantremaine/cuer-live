import { useState, useEffect, useRef, useCallback } from 'react';
import { showcallerBroadcast } from '@/utils/showcallerBroadcast';

interface UseADViewConnectionHealthProps {
  rundownId: string;
  enabled?: boolean;
  onSilentRefresh: () => Promise<void>;
  staleThresholdMs?: number; // How long without updates before considered stale
  healthCheckIntervalMs?: number; // How often to check health
}

interface ConnectionHealthState {
  showConnectionWarning: boolean;
  consecutiveFailures: number;
  lastSuccessfulRecovery: number | null;
}

const MAX_FAILURES_BEFORE_REFRESH = 5;

export const useADViewConnectionHealth = ({
  rundownId,
  enabled = true,
  onSilentRefresh,
  staleThresholdMs = 60000, // 60 seconds default
  healthCheckIntervalMs = 30000 // 30 seconds default
}: UseADViewConnectionHealthProps) => {
  const [state, setState] = useState<ConnectionHealthState>({
    showConnectionWarning: false,
    consecutiveFailures: 0,
    lastSuccessfulRecovery: null
  });
  
  const isRecoveringRef = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(Date.now());
  const lastBroadcastTimeRef = useRef<number>(Date.now());
  const isTabVisibleRef = useRef<boolean>(!document.hidden);
  
  // Mark that we received a successful poll
  const markPollReceived = useCallback(() => {
    lastPollTimeRef.current = Date.now();
    
    // If we had a warning showing, clear it since we're receiving data again
    if (state.showConnectionWarning) {
      console.log('📺 AD View: Poll received - clearing warning');
      setState(prev => ({
        ...prev,
        showConnectionWarning: false,
        consecutiveFailures: 0,
        lastSuccessfulRecovery: Date.now()
      }));
    }
  }, [state.showConnectionWarning]);

  // Mark that we received a showcaller broadcast
  const markBroadcastReceived = useCallback(() => {
    lastBroadcastTimeRef.current = Date.now();
    
    // If we had a warning showing, clear it since we're receiving broadcasts again
    if (state.showConnectionWarning) {
      console.log('📺 AD View: Broadcast received - clearing warning');
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
      console.log('📺 AD View: Already recovering, skipping...');
      return;
    }
    
    isRecoveringRef.current = true;
    
    try {
      console.warn('📺 AD View: Stale connection detected, attempting silent recovery...');
      
      // Step 1: Force reconnect the showcallerBroadcast channel
      showcallerBroadcast.forceReconnect(rundownId);
      
      // Step 2: Wait a bit for reconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Fetch fresh data silently
      await onSilentRefresh();
      
      // Step 4: Check if channel is connected
      const isChannelConnected = showcallerBroadcast.isChannelConnected(rundownId);
      
      if (isChannelConnected) {
        console.log('📺 AD View: Silent recovery successful');
        setState({
          showConnectionWarning: false,
          consecutiveFailures: 0,
          lastSuccessfulRecovery: Date.now()
        });
        lastPollTimeRef.current = Date.now();
        lastBroadcastTimeRef.current = Date.now();
      } else {
        // Recovery failed, increment counter
        setState(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          console.warn(`📺 AD View: Recovery attempt ${newFailures} failed`);
          
          // Unlike teleprompter, AD View CAN force refresh after max failures
          if (newFailures >= MAX_FAILURES_BEFORE_REFRESH) {
            console.warn(`📺 AD View: ${newFailures} consecutive failures - forcing page refresh`);
            window.location.reload();
            return prev; // Won't actually execute due to reload
          }
          
          // Show warning after 3 consecutive failures
          return {
            ...prev,
            consecutiveFailures: newFailures,
            showConnectionWarning: newFailures >= 3
          };
        });
      }
    } catch (error) {
      console.error('📺 AD View: Silent recovery error:', error);
      setState(prev => {
        const newFailures = prev.consecutiveFailures + 1;
        
        // Force refresh after max failures
        if (newFailures >= MAX_FAILURES_BEFORE_REFRESH) {
          console.warn(`📺 AD View: ${newFailures} consecutive failures - forcing page refresh`);
          window.location.reload();
          return prev;
        }
        
        // Fixed: consistent threshold >= 3 (was >= 2)
        return {
          ...prev,
          consecutiveFailures: newFailures,
          showConnectionWarning: newFailures >= 3
        };
      });
    } finally {
      isRecoveringRef.current = false;
    }
  }, [rundownId, onSilentRefresh]);

  // Health check function
  const performHealthCheck = useCallback(async () => {
    // Skip health check if tab is hidden - no point recovering if user isn't looking
    if (!isTabVisibleRef.current) {
      return;
    }
    
    // Check if showcaller broadcast channel is connected
    const isChannelConnected = showcallerBroadcast.isChannelConnected(rundownId);
    
    // Check timing of last poll and broadcast
    const timeSinceLastPoll = Date.now() - lastPollTimeRef.current;
    const timeSinceLastBroadcast = Date.now() - lastBroadcastTimeRef.current;
    
    // Consider stale if BOTH poll and broadcast haven't been received recently
    // (Poll is the main data source, broadcast is for real-time showcaller updates)
    const isPollStale = timeSinceLastPoll > staleThresholdMs;
    const isBroadcastStale = timeSinceLastBroadcast > staleThresholdMs;
    
    // Only consider stale if poll is stale AND either broadcast is stale or channel is disconnected
    const isStale = isPollStale && (isBroadcastStale || !isChannelConnected);
    
    if (isStale) {
      console.warn(`📺 AD View health check: Connection stale (poll: ${Math.round(timeSinceLastPoll/1000)}s, broadcast: ${Math.round(timeSinceLastBroadcast/1000)}s)`);
      await attemptSilentRecovery();
    } else if (!isChannelConnected && timeSinceLastBroadcast > staleThresholdMs / 2) {
      // Channel disconnected and no recent broadcasts - proactively try to reconnect
      console.warn('📺 AD View health check: Showcaller channel disconnected, attempting reconnect');
      showcallerBroadcast.forceReconnect(rundownId);
    }
  }, [rundownId, staleThresholdMs, attemptSilentRecovery]);

  // Tab visibility change handler
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      const wasHidden = !isTabVisibleRef.current;
      isTabVisibleRef.current = !document.hidden;
      
      // If tab just became visible, run immediate health check
      if (wasHidden && isTabVisibleRef.current) {
        console.log('📺 AD View: Tab became visible, running health check');
        performHealthCheck();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, performHealthCheck]);

  // Network online event handler
  useEffect(() => {
    if (!enabled) return;
    
    const handleOnline = () => {
      console.log('📺 AD View: Network online - resetting recovery state');
      
      // Reset timestamps to prevent false positive staleness detection
      lastPollTimeRef.current = Date.now();
      lastBroadcastTimeRef.current = Date.now();
      
      // Clear recovery state
      isRecoveringRef.current = false;
      setState({
        showConnectionWarning: false,
        consecutiveFailures: 0,
        lastSuccessfulRecovery: null
      });
      
      // Trigger immediate health check after short delay for network to stabilize
      setTimeout(() => {
        performHealthCheck();
      }, 1000);
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, performHealthCheck]);

  // Health check interval effect
  useEffect(() => {
    if (!enabled || !rundownId) return;
    
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
  }, [enabled, rundownId, healthCheckIntervalMs, performHealthCheck]);

  return {
    showConnectionWarning: state.showConnectionWarning,
    consecutiveFailures: state.consecutiveFailures,
    markPollReceived,
    markBroadcastReceived
  };
};
