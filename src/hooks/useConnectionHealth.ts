// Hook for consuming connection health in components - SIMPLIFIED
import { useState, useEffect } from 'react';
import { simpleConnectionHealth, SimpleHealthStatus } from '@/services/SimpleConnectionHealth';

interface UseConnectionHealthResult {
  health: SimpleHealthStatus;
  isFullyConnected: boolean;
  isDegraded: boolean;
  showWarning: boolean;
  warningMessage: string | null;
}

export const useConnectionHealth = (rundownId: string | null): UseConnectionHealthResult => {
  const [health, setHealth] = useState<SimpleHealthStatus>({
    consolidated: false,
    showcaller: false,
    cell: false,
    allConnected: false,
    anyDisconnected: false,
    consecutiveFailures: 0,
    isStabilizing: false
  });

  useEffect(() => {
    if (!rundownId) return;

    const unsubscribe = simpleConnectionHealth.subscribe(rundownId, (newHealth) => {
      setHealth(newHealth);
    });

    return unsubscribe;
  }, [rundownId]);

  // Determine warning state - simplified, just based on connection status
  const showWarning = health.anyDisconnected;
  
  let warningMessage: string | null = null;
  if (health.anyDisconnected) {
    warningMessage = 'Connection issues detected - syncing may be delayed';
  }

  return {
    health,
    isFullyConnected: health.allConnected,
    isDegraded: health.anyDisconnected,
    showWarning,
    warningMessage
  };
};
