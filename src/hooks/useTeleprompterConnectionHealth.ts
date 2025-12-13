import { useState, useEffect, useRef, useCallback } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { realtimeReset } from '@/utils/realtimeReset';
import { supabase } from '@/integrations/supabase/client';
interface UseTeleprompterConnectionHealthProps {
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

export const useTeleprompterConnectionHealth = ({
  rundownId,
  enabled = true,
  onSilentRefresh,
  staleThresholdMs = 60000,
  healthCheckIntervalMs = 30000
}: UseTeleprompterConnectionHealthProps) => {
  const [state, setState] = useState<ConnectionHealthState>({
    showConnectionWarning: false,
    consecutiveFailures: 0,
    lastSuccessfulRecovery: null
  });
  
  const isRecoveringRef = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastManualBroadcastRef = useRef<number>(Date.now());
  
  const markBroadcastReceived = useCallback(() => {
    lastManualBroadcastRef.current = Date.now();
    
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

  const attemptSilentRecovery = useCallback(async () => {
    if (isRecoveringRef.current) {
      console.log('📺 Teleprompter: Already recovering, skipping...');
      return;
    }
    
    isRecoveringRef.current = true;
    
    try {
      // First verify auth session is valid - catches network drops and token refresh failures
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.warn('📺 Teleprompter: Auth session invalid or network error - skipping recovery');
        setState(prev => ({
          ...prev,
          showConnectionWarning: true,
          consecutiveFailures: prev.consecutiveFailures + 1
        }));
        isRecoveringRef.current = false;
        return;
      }
      
      console.warn('📺 Teleprompter: Stale connection detected, attempting nuclear reset...');
      
      // Use nuclear reset
      const success = await realtimeReset.performNuclearReset();
      
      if (success) {
        // Wait for reconnection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reinitialize cell broadcast
        cellBroadcast.reinitialize(rundownId);
        
        // Wait and check
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch fresh data
        await onSilentRefresh();
        
        const isChannelConnected = cellBroadcast.isChannelConnected(rundownId);
        
        if (isChannelConnected) {
          console.log('📺 Teleprompter: Recovery successful');
          setState({
            showConnectionWarning: false,
            consecutiveFailures: 0,
            lastSuccessfulRecovery: Date.now()
          });
          lastManualBroadcastRef.current = Date.now();
        } else {
          setState(prev => {
            const newFailures = prev.consecutiveFailures + 1;
            console.warn(`📺 Teleprompter: Recovery attempt ${newFailures} failed`);
            
            // Show warning after 3 consecutive failures (but NEVER force refresh for teleprompter)
            return {
              ...prev,
              consecutiveFailures: newFailures,
              showConnectionWarning: newFailures >= 3
            };
          });
        }
      }
    } catch (error) {
      console.error('📺 Teleprompter: Recovery error:', error);
      setState(prev => ({
        ...prev,
        consecutiveFailures: prev.consecutiveFailures + 1,
        showConnectionWarning: prev.consecutiveFailures >= 2
      }));
    } finally {
      isRecoveringRef.current = false;
    }
  }, [rundownId, onSilentRefresh]);

  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    const performHealthCheck = async () => {
      const isChannelConnected = cellBroadcast.isChannelConnected(rundownId);
      const lastBroadcast = cellBroadcast.getLastBroadcastTime(rundownId);
      const manualLastBroadcast = lastManualBroadcastRef.current;
      const mostRecentBroadcast = Math.max(lastBroadcast, manualLastBroadcast);
      const timeSinceLastBroadcast = Date.now() - mostRecentBroadcast;
      
      const isStale = isChannelConnected && timeSinceLastBroadcast > staleThresholdMs;
      
      if (isStale) {
        console.warn(`📺 Teleprompter health check: Connection stale`);
        await attemptSilentRecovery();
      } else if (!isChannelConnected) {
        console.warn('📺 Teleprompter health check: Channel disconnected');
        await attemptSilentRecovery();
      }
    };
    
    const initialTimeout = setTimeout(performHealthCheck, 5000);
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
