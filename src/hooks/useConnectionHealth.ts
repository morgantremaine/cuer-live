// Hook for consuming unified connection health in components
import { useState, useEffect, useCallback } from 'react';
import { unifiedConnectionHealth, ChannelHealth } from '@/services/UnifiedConnectionHealth';

interface UseConnectionHealthResult {
  health: ChannelHealth;
  isFullyConnected: boolean;
  isDegraded: boolean;
  showWarning: boolean;
  warningMessage: string | null;
}

export const useConnectionHealth = (rundownId: string | null): UseConnectionHealthResult => {
  const [health, setHealth] = useState<ChannelHealth>({
    consolidated: false,
    showcaller: false,
    cell: false,
    allHealthy: false,
    anyDegraded: false,
    consecutiveGlobalFailures: 0
  });

  useEffect(() => {
    if (!rundownId) return;

    const unsubscribe = unifiedConnectionHealth.subscribe(rundownId, (newHealth) => {
      setHealth(newHealth);
    });

    return unsubscribe;
  }, [rundownId]);

  // Determine warning state
  const showWarning = health.anyDegraded || health.consecutiveGlobalFailures >= 3;
  
  let warningMessage: string | null = null;
  if (health.consecutiveGlobalFailures >= 7) {
    warningMessage = 'Connection problems - will refresh automatically if recovery fails';
  } else if (health.consecutiveGlobalFailures >= 3 || health.anyDegraded) {
    warningMessage = 'Connection issues detected - syncing may be delayed';
  }

  return {
    health,
    isFullyConnected: health.allHealthy,
    isDegraded: health.anyDegraded,
    showWarning,
    warningMessage
  };
};
