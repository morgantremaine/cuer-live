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

const mapHealthToStatus = (health: ReturnType<typeof simpleConnectionHealth.getHealth>): BroadcastHealthStatus => ({
  isHealthy: health.allConnected && !health.isStabilizing,
  isConnected: health.consolidated && health.showcaller && health.cell,
  successRate: health.allConnected ? 1 : 0.5,
  totalAttempts: health.consecutiveFailures,
  lastChecked: Date.now(),
  // Show as reconnecting if any channel is down OR we're in stabilization period
  isReconnecting: health.anyDisconnected || health.isStabilizing
});

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
      setHealthStatus(mapHealthToStatus(health));
    });

    // Initial check
    const health = simpleConnectionHealth.getHealth(rundownId);
    setHealthStatus(mapHealthToStatus(health));

    return unsubscribe;
  }, [rundownId, enabled]);

  return healthStatus;
};
