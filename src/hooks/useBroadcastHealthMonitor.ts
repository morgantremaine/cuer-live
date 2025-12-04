import { useEffect, useState } from 'react';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';

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

    // Subscribe to unified health updates
    const unsubscribe = unifiedConnectionHealth.subscribe(rundownId, (health) => {
      setHealthStatus({
        isHealthy: health.allHealthy,
        isConnected: health.consolidated && health.showcaller && health.cell,
        successRate: health.allHealthy ? 1 : 0.5,
        totalAttempts: health.consecutiveGlobalFailures,
        lastChecked: Date.now(),
        isReconnecting: health.anyDegraded
      });
    });

    // Initial check
    const health = unifiedConnectionHealth.getHealth(rundownId);
    setHealthStatus({
      isHealthy: health.allHealthy,
      isConnected: health.consolidated && health.showcaller && health.cell,
      successRate: health.allHealthy ? 1 : 0.5,
      totalAttempts: health.consecutiveGlobalFailures,
      lastChecked: Date.now(),
      isReconnecting: health.anyDegraded
    });

    return unsubscribe;
  }, [rundownId, enabled]);

  return healthStatus;
};
