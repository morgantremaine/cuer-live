import { useEffect, useState } from 'react';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';

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

    const unsubscribe = simpleConnectionHealth.subscribe(rundownId, (health) => {
      setHealthStatus({
        isHealthy: health.allConnected,
        isConnected: health.consolidated && health.showcaller && health.cell,
        successRate: health.allConnected ? 1 : 0.5,
        totalAttempts: health.consecutiveFailures,
        lastChecked: Date.now(),
        isReconnecting: health.anyDisconnected
      });
    });

    // Initial check
    const health = simpleConnectionHealth.getHealth(rundownId);
    setHealthStatus({
      isHealthy: health.allConnected,
      isConnected: health.consolidated && health.showcaller && health.cell,
      successRate: health.allConnected ? 1 : 0.5,
      totalAttempts: health.consecutiveFailures,
      lastChecked: Date.now(),
      isReconnecting: health.anyDisconnected
    });

    return unsubscribe;
  }, [rundownId, enabled]);

  return healthStatus;
};
