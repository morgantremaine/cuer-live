import { useState, useEffect } from 'react';
import { universalTimeService, getUniversalTime, getTimeDrift, isTimeSynced, syncTime } from '@/services/UniversalTimeService';

interface UseUniversalTimingReturn {
  getUniversalTime: () => number;
  syncWithServer: () => Promise<void>;
  getTimeDrift: () => number;
  isTimeSynced: boolean;
}

/**
 * Universal timing hook that provides synchronized time across all clients
 * This prevents timing discrepancies caused by different system clocks
 * Now uses centralized UniversalTimeService for consistency
 */
export const useUniversalTiming = (): UseUniversalTimingReturn => {
  const [syncStatus, setSyncStatus] = useState(() => universalTimeService.getSyncStatus());

  // Update sync status when service state changes
  useEffect(() => {
    const checkSyncStatus = () => {
      setSyncStatus(universalTimeService.getSyncStatus());
    };

    // Check initially
    checkSyncStatus();

    // Set up periodic status checks
    const statusInterval = setInterval(checkSyncStatus, 1000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  return {
    getUniversalTime,
    syncWithServer: syncTime,
    getTimeDrift,
    isTimeSynced: syncStatus.isTimeSynced
  };
};