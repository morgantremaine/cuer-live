import { useCallback, useRef, useEffect, useState } from 'react';

interface UseUniversalTimingReturn {
  getUniversalTime: () => number;
  syncWithServer: () => Promise<void>;
  getTimeDrift: () => number;
  isTimeSynced: boolean;
}

/**
 * Universal timing hook that provides synchronized time across all clients
 * This prevents timing discrepancies caused by different system clocks
 */
export const useUniversalTiming = (): UseUniversalTimingReturn => {
  const [timeDrift, setTimeDrift] = useState<number>(0);
  const [isTimeSynced, setIsTimeSynced] = useState<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);
  const performanceBaseRef = useRef<number>(performance.now());

  // Get synchronized universal time in milliseconds
  const getUniversalTime = useCallback((): number => {
    // Use performance.now() for high precision, but adjust for drift
    const performanceTime = performance.now();
    const elapsedSinceBase = performanceTime - performanceBaseRef.current;
    
    // Convert performance time to unix timestamp and adjust for drift
    const baseUnixTime = performance.timeOrigin + performanceBaseRef.current;
    return baseUnixTime + elapsedSinceBase - timeDrift;
  }, [timeDrift]);

  // Sync with server time to calculate drift
  const syncWithServer = useCallback(async (): Promise<void> => {
    try {
      const requestStart = performance.now();
      
      // Use a simple HTTP request to get server time
      // This could be enhanced to use Supabase's server time
      const response = await fetch('https://worldtimeapi.org/api/timezone/UTC');
      const requestEnd = performance.now();
      
      if (response.ok) {
        const data = await response.json();
        const serverTime = new Date(data.datetime).getTime();
        
        // Account for network latency
        const networkLatency = (requestEnd - requestStart) / 2;
        const adjustedServerTime = serverTime + networkLatency;
        
        // Calculate our local time drift
        const localTime = Date.now();
        const drift = localTime - adjustedServerTime;
        
        setTimeDrift(drift);
        setIsTimeSynced(true);
        lastSyncTimeRef.current = performance.now();
        
        console.log('🕐 Time sync completed:', {
          drift: `${drift}ms`,
          networkLatency: `${networkLatency}ms`,
          serverTime: new Date(serverTime).toISOString(),
          localTime: new Date(localTime).toISOString()
        });
      }
    } catch (error) {
      console.warn('🕐 Time sync failed, using local time:', error);
      // Fallback to local time if sync fails
      setTimeDrift(0);
      setIsTimeSynced(false);
    }
  }, []);

  const getTimeDrift = useCallback(() => timeDrift, [timeDrift]);

  // Auto-sync on mount and periodically re-sync
  useEffect(() => {
    syncWithServer();
    
    // Re-sync every 5 minutes to account for clock drift
    const syncInterval = setInterval(syncWithServer, 5 * 60 * 1000);
    
    return () => clearInterval(syncInterval);
  }, [syncWithServer]);

  return {
    getUniversalTime,
    syncWithServer,
    getTimeDrift,
    isTimeSynced
  };
};