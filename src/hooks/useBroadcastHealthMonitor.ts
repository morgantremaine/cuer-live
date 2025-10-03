import { useEffect, useState } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';

interface BroadcastHealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  successRate: number;
  totalAttempts: number;
  lastChecked: number;
  circuitState?: 'closed' | 'open' | 'half-open';
  retryIn?: number;
}

export const useBroadcastHealthMonitor = (rundownId: string, enabled = true) => {
  const [healthStatus, setHealthStatus] = useState<BroadcastHealthStatus>({
    isHealthy: true,
    isConnected: false,
    successRate: 1,
    totalAttempts: 0,
    lastChecked: Date.now()
  });

  useEffect(() => {
    if (!enabled || !rundownId) return;

    const checkHealth = () => {
      const metrics = cellBroadcast.getHealthMetrics(rundownId);
      const coordinatorStatus = realtimeReconnectionCoordinator.getStatus();
      
      // Find circuit state for cell connections related to this rundown
      const cellConnection = coordinatorStatus.connections.find(c => 
        c.id === `cell-${rundownId}` || c.id === `showcaller-${rundownId}`
      );
      
      setHealthStatus({
        isHealthy: metrics.isHealthy && (!cellConnection || cellConnection.circuitState === 'closed'),
        isConnected: metrics.isConnected,
        successRate: metrics.successRate,
        totalAttempts: metrics.total,
        lastChecked: Date.now(),
        circuitState: cellConnection?.circuitState || 'closed',
        retryIn: cellConnection?.retryIn || 0
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