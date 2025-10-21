import { useEffect, useState, useRef } from 'react';
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
  isReconnecting: boolean;
  reconnectionStartTime?: number;
  isFlapping: boolean;
}

const RECONNECTION_GRACE_PERIOD = 5000; // 5 seconds
const FLAPPING_WINDOW = 30000; // 30 seconds
const FLAPPING_THRESHOLD = 3; // 3+ reconnection cycles = flapping

export const useBroadcastHealthMonitor = (rundownId: string, enabled = true) => {
  const [healthStatus, setHealthStatus] = useState<BroadcastHealthStatus>({
    isHealthy: true,
    isConnected: false,
    successRate: 1,
    totalAttempts: 0,
    lastChecked: Date.now(),
    isReconnecting: false,
    isFlapping: false
  });

  // Track reconnection cycles for flapping detection
  const reconnectionCyclesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled || !rundownId) return;

    const checkHealth = () => {
      const metrics = cellBroadcast.getHealthMetrics(rundownId);
      const coordinatorStatus = realtimeReconnectionCoordinator.getStatus();
      
      // Find circuit state for cell connections related to this rundown
      const cellConnection = coordinatorStatus.connections.find(c => 
        c.id === `cell-${rundownId}` || c.id === `showcaller-${rundownId}`
      );
      
      const circuitState = cellConnection?.circuitState || 'closed';
      const isReconnecting = circuitState !== 'closed';
      const now = Date.now();
      
      // Track reconnection cycles for flapping detection
      if (isReconnecting && !healthStatus.isReconnecting) {
        // New reconnection cycle started
        reconnectionCyclesRef.current.push(now);
        // Clean up old cycles outside the flapping window
        reconnectionCyclesRef.current = reconnectionCyclesRef.current.filter(
          timestamp => now - timestamp < FLAPPING_WINDOW
        );
      }
      
      // Detect flapping: 3+ reconnection cycles in the last 30 seconds
      const isFlapping = reconnectionCyclesRef.current.length >= FLAPPING_THRESHOLD;
      
      // Calculate time in reconnection state
      const reconnectionStartTime = isReconnecting 
        ? (healthStatus.reconnectionStartTime || now)
        : undefined;
      
      const timeInReconnection = reconnectionStartTime 
        ? now - reconnectionStartTime 
        : 0;
      
      // Only mark as unhealthy if:
      // 1. Broadcast metrics are unhealthy, OR
      // 2. Circuit is open/half-open AND (grace period expired OR flapping detected)
      const isHealthy = metrics.isHealthy && (
        circuitState === 'closed' ||
        (timeInReconnection < RECONNECTION_GRACE_PERIOD && !isFlapping)
      );
      
      setHealthStatus({
        isHealthy,
        isConnected: metrics.isConnected,
        successRate: metrics.successRate,
        totalAttempts: metrics.total,
        lastChecked: now,
        circuitState,
        retryIn: cellConnection?.retryIn || 0,
        isReconnecting,
        reconnectionStartTime,
        isFlapping
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