import { useState, useEffect, useRef, useCallback } from 'react';
import { showcallerBroadcast } from '@/utils/showcallerBroadcast';
import { realtimeReset } from '@/utils/realtimeReset';
import { supabase } from '@/integrations/supabase/client';
interface UseADViewConnectionHealthProps {
  rundownId: string;
  enabled?: boolean;
  onSilentRefresh: () => Promise<void>;
  staleThresholdMs?: number;
  healthCheckIntervalMs?: number;
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
  staleThresholdMs = 60000,
  healthCheckIntervalMs = 30000
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
  
  const markPollReceived = useCallback(() => {
    lastPollTimeRef.current = Date.now();
    setState(prev => {
      if (prev.showConnectionWarning) {
        console.log('📺 AD View: Poll received - clearing warning');
        return {
          ...prev,
          showConnectionWarning: false,
          consecutiveFailures: 0,
          lastSuccessfulRecovery: Date.now()
        };
      }
      return prev;
    });
  }, []);

  const markBroadcastReceived = useCallback(() => {
    lastBroadcastTimeRef.current = Date.now();
    setState(prev => {
      if (prev.showConnectionWarning) {
        console.log('📺 AD View: Broadcast received - clearing warning');
        return {
          ...prev,
          showConnectionWarning: false,
          consecutiveFailures: 0,
          lastSuccessfulRecovery: Date.now()
        };
      }
      return prev;
    });
  }, []);

  // Attempt recovery using nuclear reset
  const attemptSilentRecovery = useCallback(async () => {
    if (isRecoveringRef.current) {
      console.log('📺 AD View: Already recovering, skipping...');
      return;
    }
    
    isRecoveringRef.current = true;
    
    try {
      // First verify auth session is valid - catches network drops and token refresh failures
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.warn('📺 AD View: Auth session invalid or network error - skipping recovery');
        setState(prev => ({
          ...prev,
          showConnectionWarning: true,
          consecutiveFailures: prev.consecutiveFailures + 1
        }));
        isRecoveringRef.current = false;
        return;
      }
      
      console.warn('📺 AD View: Stale connection detected, attempting nuclear reset...');
      
      // Use nuclear reset
      const success = await realtimeReset.performNuclearReset();
      
      if (success) {
        // Wait for reconnection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reinitialize showcaller
        showcallerBroadcast.reinitialize(rundownId);
        
        // Wait and check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch fresh data
        await onSilentRefresh();
        
        const isChannelConnected = showcallerBroadcast.isChannelConnected(rundownId);
        
        if (isChannelConnected) {
          console.log('📺 AD View: Recovery successful');
          setState({
            showConnectionWarning: false,
            consecutiveFailures: 0,
            lastSuccessfulRecovery: Date.now()
          });
          lastPollTimeRef.current = Date.now();
          lastBroadcastTimeRef.current = Date.now();
        } else {
          setState(prev => {
            const newFailures = prev.consecutiveFailures + 1;
            console.warn(`📺 AD View: Recovery attempt ${newFailures} failed`);
            
            if (newFailures >= MAX_FAILURES_BEFORE_REFRESH) {
              console.warn(`📺 AD View: ${newFailures} consecutive failures - forcing page refresh`);
              window.location.reload();
              return prev;
            }
            
            return {
              ...prev,
              consecutiveFailures: newFailures,
              showConnectionWarning: newFailures >= 3
            };
          });
        }
      }
    } catch (error) {
      console.error('📺 AD View: Recovery error:', error);
      setState(prev => {
        const newFailures = prev.consecutiveFailures + 1;
        
        if (newFailures >= MAX_FAILURES_BEFORE_REFRESH) {
          window.location.reload();
          return prev;
        }
        
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

  const performHealthCheck = useCallback(async () => {
    const isChannelConnected = showcallerBroadcast.isChannelConnected(rundownId);
    const timeSinceLastPoll = Date.now() - lastPollTimeRef.current;
    const timeSinceLastBroadcast = Date.now() - lastBroadcastTimeRef.current;
    
    const isPollStale = timeSinceLastPoll > staleThresholdMs;
    const isBroadcastStale = timeSinceLastBroadcast > staleThresholdMs;
    const isStale = isPollStale && (isBroadcastStale || !isChannelConnected);
    
    if (isStale) {
      console.warn(`📺 AD View health check: Connection stale`);
      await attemptSilentRecovery();
    } else if (!isChannelConnected && timeSinceLastBroadcast > staleThresholdMs / 2) {
      console.warn('📺 AD View health check: Showcaller channel disconnected');
      showcallerBroadcast.reinitialize(rundownId);
    }
  }, [rundownId, staleThresholdMs, attemptSilentRecovery]);

  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      const wasHidden = !isTabVisibleRef.current;
      isTabVisibleRef.current = !document.hidden;
      
      if (wasHidden && isTabVisibleRef.current) {
        console.log('📺 AD View: Tab became visible, running health check');
        performHealthCheck();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, performHealthCheck]);

  useEffect(() => {
    if (!enabled) return;
    
    const handleOnline = () => {
      console.log('📺 AD View: Network online');
      lastPollTimeRef.current = Date.now();
      lastBroadcastTimeRef.current = Date.now();
      isRecoveringRef.current = false;
      setState({
        showConnectionWarning: false,
        consecutiveFailures: 0,
        lastSuccessfulRecovery: null
      });
      setTimeout(() => performHealthCheck(), 1000);
    };
    
    const handleOffline = () => {
      console.warn('📺 AD View: Network offline detected');
      setState(prev => ({ ...prev, showConnectionWarning: true }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, performHealthCheck]);

  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    const initialTimeout = setTimeout(performHealthCheck, 5000);
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
