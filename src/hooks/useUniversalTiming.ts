import { useState, useEffect } from 'react';
import { universalTimeService, getUniversalTime, getTimeDrift, isTimeSynced, syncTime } from '@/services/UniversalTimeService';

interface UseUniversalTimingReturn {
  getUniversalTime: () => number;
  syncWithServer: () => Promise<void>;
  getTimeDrift: () => number;
  isTimeSynced: boolean;
}

/**
 * Simplified universal timing hook that provides synchronized time across all clients
 * Now uses Supabase server timestamps as the single source of truth
 * No more external API dependencies or complex retry logic
 */
export const useUniversalTiming = (): UseUniversalTimingReturn => {
  const [syncStatus, setSyncStatus] = useState(() => universalTimeService.getSyncStatus());

  // Update sync status when service state changes (much less frequently)
  useEffect(() => {
    const checkSyncStatus = () => {
      setSyncStatus(universalTimeService.getSyncStatus());
    };

    // Check initially
    checkSyncStatus();

    // Set up periodic status checks (much less frequent since we use server timestamps)
    const statusInterval = setInterval(checkSyncStatus, 30000); // Every 30 seconds instead of 5

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