import { useState, useEffect, useRef, useCallback } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { showcallerBroadcast } from '@/utils/showcallerBroadcast';
import { forceReconnectConsolidated, getLastConsolidatedUpdateTime } from '@/hooks/useConsolidatedRealtimeRundown';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';
import { toast } from 'sonner';

interface UseMainRundownConnectionHealthProps {
  rundownId: string | null;
  enabled?: boolean;
  staleThresholdMs?: number; // How long without activity before considered stale
  healthCheckIntervalMs?: number; // How often to check health
  onCatchupSync?: () => Promise<boolean>; // Callback to trigger catch-up sync after recovery
}

interface ConnectionHealthState {
  showConnectionWarning: boolean;
  consecutiveFailures: number;
  lastSuccessfulRecovery: number | null;
  isRecovering: boolean;
}

const MAX_FAILURES_BEFORE_REFRESH = 6;
const WARNING_THRESHOLD = 3;

export const useMainRundownConnectionHealth = ({
  rundownId,
  enabled = true,
  staleThresholdMs = 90000, // 90 seconds - tighter than teleprompter
  healthCheckIntervalMs = 30000, // 30 seconds
  onCatchupSync
}: UseMainRundownConnectionHealthProps) => {
  const [state, setState] = useState<ConnectionHealthState>({
    showConnectionWarning: false,
    consecutiveFailures: 0,
    lastSuccessfulRecovery: null,
    isRecovering: false
  });
  
  const isRecoveringRef = useRef(false);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const mountedRef = useRef(true);
  
  // Mark that we received any activity (cell update, showcaller, consolidated update)
  const markActivityReceived = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // If we had a warning showing, clear it since we're receiving data again
    if (state.showConnectionWarning && mountedRef.current) {
      console.log('📡 Main Rundown: Connection recovered - clearing warning');
      setState(prev => ({
        ...prev,
        showConnectionWarning: false,
        consecutiveFailures: 0,
        lastSuccessfulRecovery: Date.now()
      }));
    }
  }, [state.showConnectionWarning]);

  // Attempt silent recovery - force reconnect all channels including consolidated
  const attemptSilentRecovery = useCallback(async () => {
    if (!rundownId || isRecoveringRef.current) {
      console.log('📡 Main Rundown: Already recovering or no rundownId, skipping...');
      return;
    }
    
    isRecoveringRef.current = true;
    if (mountedRef.current) {
      setState(prev => ({ ...prev, isRecovering: true }));
    }
    
    try {
      console.warn('📡 Main Rundown: Stale connection detected, attempting silent recovery...');
      
      // Step 1: Force reconnect ALL channels in parallel (including consolidated)
      const reconnectPromises = [
        cellBroadcast.forceReconnect(rundownId).catch(e => console.warn('Cell reconnect error:', e)),
        showcallerBroadcast.forceReconnect(rundownId).catch(e => console.warn('Showcaller reconnect error:', e)),
        forceReconnectConsolidated(rundownId).catch(e => console.warn('Consolidated reconnect error:', e))
      ];
      
      await Promise.all(reconnectPromises);
      
      // Step 2: Wait briefly for reconnection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 3: Check if we're now connected
      const isCellConnected = cellBroadcast.isChannelConnected(rundownId);
      const isShowcallerConnected = showcallerBroadcast.isChannelConnected(rundownId);
      const health = unifiedConnectionHealth.getHealth(rundownId);
      
      const anyChannelConnected = isCellConnected || isShowcallerConnected || health.consolidated;
      
      if (anyChannelConnected) {
        console.log('📡 Main Rundown: Channels reconnected, triggering catch-up sync...');
        
        // Step 4: CRITICAL - Explicitly trigger catch-up sync to fetch latest data
        if (onCatchupSync) {
          try {
            const syncResult = await onCatchupSync();
            console.log('📡 Main Rundown: Catch-up sync completed:', syncResult ? 'updates applied' : 'already up to date');
          } catch (syncError) {
            console.warn('📡 Main Rundown: Catch-up sync error:', syncError);
          }
        }
        
        // Mark recovery successful
        if (mountedRef.current) {
          setState({
            showConnectionWarning: false,
            consecutiveFailures: 0,
            lastSuccessfulRecovery: Date.now(),
            isRecovering: false
          });
        }
        lastActivityRef.current = Date.now();
      } else {
        // Recovery failed, increment counter
        if (mountedRef.current) {
          setState(prev => {
            const newFailures = prev.consecutiveFailures + 1;
            console.warn(`📡 Main Rundown: Recovery attempt ${newFailures} failed`);
            
            // Check if we should force refresh
            if (newFailures >= MAX_FAILURES_BEFORE_REFRESH) {
              console.error('📡 Main Rundown: Too many consecutive failures - forcing page refresh');
              toast.error('Connection recovery failed. Refreshing page...', { duration: 3000 });
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
            
            return {
              ...prev,
              consecutiveFailures: newFailures,
              showConnectionWarning: newFailures >= WARNING_THRESHOLD,
              isRecovering: false
            };
          });
        }
      }
    } catch (error) {
      console.error('📡 Main Rundown: Silent recovery error:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          consecutiveFailures: prev.consecutiveFailures + 1,
          showConnectionWarning: prev.consecutiveFailures >= WARNING_THRESHOLD - 1,
          isRecovering: false
        }));
      }
    } finally {
      isRecoveringRef.current = false;
    }
  }, [rundownId, onCatchupSync]);

  // Health check - runs every healthCheckIntervalMs
  const performHealthCheck = useCallback(async () => {
    if (!rundownId || !mountedRef.current) return;
    
    // Check all channel connection statuses
    const isCellConnected = cellBroadcast.isChannelConnected(rundownId);
    const isShowcallerConnected = showcallerBroadcast.isChannelConnected(rundownId);
    const health = unifiedConnectionHealth.getHealth(rundownId);
    
    // Check last activity time - combines local tracking, cell broadcast, AND consolidated updates
    const lastCellBroadcast = cellBroadcast.getLastBroadcastTime(rundownId);
    const lastConsolidated = getLastConsolidatedUpdateTime(rundownId);
    const mostRecentActivity = Math.max(lastActivityRef.current, lastCellBroadcast, lastConsolidated);
    const timeSinceActivity = Date.now() - mostRecentActivity;
    
    // Multiple staleness conditions:
    // 1. All channels report connected but no activity for staleThresholdMs
    // 2. Any channel explicitly disconnected
    
    const allChannelsReportConnected = isCellConnected && isShowcallerConnected && health.consolidated;
    const isStale = allChannelsReportConnected && timeSinceActivity > staleThresholdMs;
    const anyChannelDisconnected = !isCellConnected || !isShowcallerConnected || !health.consolidated;
    
    if (isStale) {
      console.warn(`📡 Main Rundown health check: Connection stale (${Math.round(timeSinceActivity/1000)}s since last activity)`);
      await attemptSilentRecovery();
    } else if (anyChannelDisconnected && navigator.onLine) {
      // Only try recovery if browser reports online but channels are disconnected
      console.warn('📡 Main Rundown health check: Channel(s) disconnected', {
        cell: isCellConnected,
        showcaller: isShowcallerConnected,
        consolidated: health.consolidated
      });
      await attemptSilentRecovery();
    }
  }, [rundownId, staleThresholdMs, attemptSilentRecovery]);

  // Set up health check interval
  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled || !rundownId) {
      return () => { mountedRef.current = false; };
    }
    
    // Run initial check after short delay (let channels establish first)
    const initialTimeout = setTimeout(performHealthCheck, 10000);
    
    // Set up periodic health checks
    healthCheckIntervalRef.current = setInterval(performHealthCheck, healthCheckIntervalMs);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [enabled, rundownId, healthCheckIntervalMs, performHealthCheck]);

  // Set up heartbeat - sends periodic ping to keep channels alive during quiet periods
  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    // Send heartbeat every 60 seconds to keep channels alive
    const sendHeartbeat = () => {
      cellBroadcast.sendHeartbeat(rundownId);
    };
    
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 60000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [enabled, rundownId]);

  // Manual retry function for user-initiated recovery
  const manualRetry = useCallback(async () => {
    toast.info('Attempting to reconnect...', { duration: 2000 });
    await attemptSilentRecovery();
  }, [attemptSilentRecovery]);

  return {
    showConnectionWarning: state.showConnectionWarning,
    consecutiveFailures: state.consecutiveFailures,
    isRecovering: state.isRecovering,
    markActivityReceived,
    manualRetry
  };
};
