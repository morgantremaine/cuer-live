import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useTransportManager } from './useTransportManager';
import { useOfflineQueue } from './useOfflineQueue';

export type TransportMode = 'cloud' | 'local' | 'offline';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'failed';

export interface SmartTransportState {
  mode: TransportMode;
  status: ConnectionStatus;
  lastSuccessfulConnection: number;
  failoverReason: string | null;
  reconnectAttempts: number;
  isStable: boolean;
  cloudLatency: number;
  localLatency: number;
}

export interface TransportHealth {
  cloud: {
    available: boolean;
    latency: number;
    lastCheck: number;
    error?: string;
  };
  local: {
    available: boolean;
    latency: number;
    lastCheck: number;
    hosts: number;
    error?: string;
  };
  offline: {
    queueSize: number;
    lastSync: number;
  };
}

export const useSmartTransportSwitching = (rundownId: string | null) => {
  const { isConnected: isNetworkConnected, checkConnection } = useNetworkStatus();
  const { transport: transportManager, availableHosts, updateConnectionStatus } = useTransportManager();
  const offlineQueue = useOfflineQueue(rundownId || '');

  const [transportState, setTransportState] = useState<SmartTransportState>({
    mode: 'offline',
    status: 'disconnected',
    lastSuccessfulConnection: 0,
    failoverReason: null,
    reconnectAttempts: 0,
    isStable: false,
    cloudLatency: 0,
    localLatency: 0
  });

  const [transportHealth, setTransportHealth] = useState<TransportHealth>({
    cloud: {
      available: false,
      latency: 0,
      lastCheck: 0
    },
    local: {
      available: false,
      latency: 0,
      lastCheck: 0,
      hosts: 0
    },
    offline: {
      queueSize: 0,
      lastSync: 0
    }
  });

  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTransportModeRef = useRef<TransportMode>('offline');
  const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Health check for cloud connectivity
  const checkCloudHealth = useCallback(async (): Promise<{ available: boolean; latency: number; error?: string }> => {
    const startTime = Date.now();
    
    try {
      // Test actual Supabase connectivity
      const isConnected = await checkConnection();
      const latency = Date.now() - startTime;
      
      return {
        available: isConnected,
        latency,
        error: isConnected ? undefined : 'Cloud unreachable'
      };
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }, [checkConnection]);

  // Health check for local hosts
  const checkLocalHealth = useCallback(async (): Promise<{ available: boolean; latency: number; hosts: number; error?: string }> => {
    const startTime = Date.now();
    
    try {
      const availableHostCount = availableHosts.filter(host => host.isAvailable).length;
      
      if (availableHostCount === 0) {
        return {
          available: false,
          latency: Date.now() - startTime,
          hosts: 0,
          error: 'No local hosts found'
        };
      }
      
      // Test connectivity to the best available host
      const bestHost = availableHosts.find(host => host.isAvailable);
      if (bestHost) {
        const testStart = Date.now();
        const response = await fetch(`${bestHost.url.replace('ws://', 'http://')}/health`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        
        const latency = Date.now() - testStart;
        
        return {
          available: response.ok,
          latency,
          hosts: availableHostCount,
          error: response.ok ? undefined : `Host responded with ${response.status}`
        };
      }
      
      return {
        available: false,
        latency: Date.now() - startTime,
        hosts: availableHostCount,
        error: 'No testable hosts'
      };
      
    } catch (error) {
      return {
        available: false,
        latency: Date.now() - startTime,
        hosts: 0,
        error: error instanceof Error ? error.message : 'Local network error'
      };
    }
  }, [availableHosts]);

  // Comprehensive transport health check
  const performHealthCheck = useCallback(async () => {
    console.log('🔍 Performing transport health check...');
    
    const [cloudHealth, localHealth] = await Promise.all([
      checkCloudHealth(),
      checkLocalHealth()
    ]);

    const newHealth: TransportHealth = {
      cloud: {
        ...cloudHealth,
        lastCheck: Date.now()
      },
      local: {
        ...localHealth,
        lastCheck: Date.now()
      },
      offline: {
        queueSize: offlineQueue.queueLength || 0,
        lastSync: Date.now() // Use current time as fallback since lastSync isn't available
      }
    };

    setTransportHealth(newHealth);
    return newHealth;
  }, [checkCloudHealth, checkLocalHealth, offlineQueue]);

  // Smart transport selection logic
  const selectOptimalTransport = useCallback((health: TransportHealth): {
    mode: TransportMode;
    reason: string;
  } => {
    console.log('🎯 Selecting optimal transport:', health);

    // Priority 1: Cloud if available and network is connected
    if (isNetworkConnected && health.cloud.available) {
      return {
        mode: 'cloud',
        reason: 'Cloud available with stable network'
      };
    }

    // Priority 2: Local host if available
    if (health.local.available && health.local.hosts > 0) {
      return {
        mode: 'local',
        reason: `Local host available (${health.local.hosts} hosts found)`
      };
    }

    // Priority 3: Cloud with degraded network (if cloud thinks it's available)
    if (health.cloud.available && health.cloud.latency < 10000) {
      return {
        mode: 'cloud',
        reason: 'Cloud available but network may be unstable'
      };
    }

    // Priority 4: Offline mode
    return {
      mode: 'offline',
      reason: health.cloud.error && health.local.error 
        ? `Both cloud (${health.cloud.error}) and local (${health.local.error}) unavailable`
        : 'No transport available'
    };
  }, [isNetworkConnected]);

  // Switch transport mode with proper state management
  const switchTransportMode = useCallback(async (newMode: TransportMode, reason: string) => {
    const oldMode = transportState.mode;
    
    if (oldMode === newMode) {
      console.log(`🔄 Already in ${newMode} mode`);
      return;
    }

    console.log(`🔄 Transport switching: ${oldMode} → ${newMode} (${reason})`);

    setTransportState(prev => ({
      ...prev,
      mode: newMode,
      status: 'connecting',
      failoverReason: reason,
      reconnectAttempts: oldMode !== 'offline' ? prev.reconnectAttempts + 1 : 0,
      isStable: false
    }));

    // Clear previous stability timeout
    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
    }

    // Update transport manager
    updateConnectionStatus(false); // Mark as disconnected during switch
    
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update connection status based on mode
      const isConnected = newMode !== 'offline';
      updateConnectionStatus(isConnected);
      
      setTransportState(prev => ({
        ...prev,
        status: isConnected ? 'connected' : 'disconnected',
        lastSuccessfulConnection: isConnected ? Date.now() : prev.lastSuccessfulConnection
      }));

      // Mark as stable after a brief period
      stabilityTimeoutRef.current = setTimeout(() => {
        setTransportState(prev => ({
          ...prev,
          isStable: true
        }));
      }, 3000);

      console.log(`✅ Successfully switched to ${newMode} mode`);
      
    } catch (error) {
      console.error(`❌ Failed to switch to ${newMode} mode:`, error);
      
      setTransportState(prev => ({
        ...prev,
        status: 'failed',
        failoverReason: `Failed to connect via ${newMode}: ${error}`
      }));
    }
  }, [transportState.mode, updateConnectionStatus]);

  // Main health monitoring and switching logic
  useEffect(() => {
    if (!rundownId) return;

    const runHealthCheckAndSwitch = async () => {
      const health = await performHealthCheck();
      const { mode: optimalMode, reason } = selectOptimalTransport(health);
      
      // Only switch if the optimal mode is different from current
      if (optimalMode !== transportState.mode) {
        await switchTransportMode(optimalMode, reason);
      } else if (transportState.status === 'failed') {
        // Retry current mode if it was previously failed
        console.log(`🔄 Retrying ${transportState.mode} mode after failure`);
        await switchTransportMode(optimalMode, `Retry after failure: ${reason}`);
      }
    };

    // Initial check
    runHealthCheckAndSwitch();

    // Periodic health checks every 15 seconds
    healthCheckIntervalRef.current = setInterval(runHealthCheckAndSwitch, 15000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [rundownId, transportState.mode, transportState.status, performHealthCheck, selectOptimalTransport, switchTransportMode]);

  // Force transport mode (for manual user selection)
  const forceTransportMode = useCallback(async (mode: TransportMode, reason: string = 'Manual selection') => {
    console.log(`🎯 Forcing transport mode to ${mode}: ${reason}`);
    await switchTransportMode(mode, reason);
  }, [switchTransportMode]);

  // Get transport status for UI
  const getTransportStatus = useCallback(() => {
    const statusColor = {
      connected: 'green',
      connecting: 'yellow', 
      disconnected: 'gray',
      failed: 'red'
    }[transportState.status];

    const modeIcon = {
      cloud: '☁️',
      local: '🏠', 
      offline: '📴'
    }[transportState.mode];

    return {
      mode: transportState.mode,
      status: transportState.status,
      color: statusColor,
      icon: modeIcon,
      isStable: transportState.isStable,
      reason: transportState.failoverReason,
      reconnectAttempts: transportState.reconnectAttempts,
      lastConnection: transportState.lastSuccessfulConnection
    };
  }, [transportState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (stabilityTimeoutRef.current) {
        clearTimeout(stabilityTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    transportState,
    transportHealth,
    
    // Status
    getTransportStatus,
    
    // Actions  
    forceTransportMode,
    performHealthCheck,
    
    // Transport manager integration
    isConnected: transportState.status === 'connected',
    mode: transportState.mode
  };
};