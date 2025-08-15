import { useEffect } from 'react';
import { updateTimeFromServer } from '@/services/UniversalTimeService';

/**
 * Hook to automatically sync time from Supabase server timestamps
 * This should be used wherever we receive server data with timestamps
 */
export const useServerTimeSync = (serverData?: { updated_at?: string; created_at?: string } | null) => {
  useEffect(() => {
    if (serverData?.updated_at) {
      updateTimeFromServer(serverData.updated_at);
    } else if (serverData?.created_at) {
      updateTimeFromServer(serverData.created_at);
    }
  }, [serverData?.updated_at, serverData?.created_at]);
};

/**
 * Manual function to sync time from any server timestamp
 */
export const syncTimeFromServerData = (data: any) => {
  if (data?.updated_at) {
    updateTimeFromServer(data.updated_at);
  } else if (data?.created_at) {
    updateTimeFromServer(data.created_at);
  }
};