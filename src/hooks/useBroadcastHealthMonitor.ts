import { useEffect, useState } from 'react';
import { cellBroadcast } from '@/utils/cellBroadcast';

interface BroadcastHealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  successRate: number;
  totalAttempts: number;
  lastChecked: number;
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
      
      setHealthStatus({
        isHealthy: metrics.isHealthy,
        isConnected: metrics.isConnected,
        successRate: metrics.successRate,
        totalAttempts: metrics.total,
        lastChecked: Date.now()
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