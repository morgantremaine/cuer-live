import { useEffect, useState, useRef } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';

interface BroadcastHealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  successRate: number;
  totalAttempts: number;
  lastChecked: number;
  isReconnecting: boolean;
}

export const useBroadcastHealthMonitor = (rundownId: string, enabled = true) => {
  const [healthStatus, setHealthStatus] = useState<BroadcastHealthStatus>({
    isHealthy: true,
    isConnected: false,
    successRate: 1,
    totalAttempts: 0,
    lastChecked: Date.now(),
    isReconnecting: false
  });

  useEffect(() => {
    if (!enabled || !rundownId) return;

    const checkHealth = () => {
      const metrics = cellBroadcast.getHealthMetrics(rundownId);
      const coordinatorStatus = realtimeReconnectionCoordinator.getStatus();
      
      // Check if coordinator is currently reconnecting
      const isReconnecting = coordinatorStatus.isReconnecting;
      
      setHealthStatus({
        isHealthy: metrics.isHealthy,
        isConnected: metrics.isConnected,
        successRate: metrics.successRate,
        totalAttempts: metrics.total,
        lastChecked: Date.now(),
        isReconnecting
      });
    };

    // Initial check
    checkHealth();

    // Set up periodic health monitoring
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [rundownId, enabled]);

  return healthStatus;
};