
import { useMemo, useCallback } from 'react';
import { useRealtimeCollaboration } from './useRealtimeCollaboration';
import { useRundownStorage } from './useRundownStorage';

interface UseStableRundownRealtimeProps {
  rundownId: string | null;
  enabled?: boolean;
}

export const useStableRundownRealtime = ({ 
  rundownId, 
  enabled = true 
}: UseStableRundownRealtimeProps) => {
  const { loadRundowns } = useRundownStorage();

  // Stable callback for remote updates
  const onRemoteUpdate = useCallback(() => {
    console.log('📡 Remote update detected, refreshing rundowns...');
    loadRundowns();
  }, [loadRundowns]);

  // Use realtime collaboration with stable props
  const { isConnected } = useRealtimeCollaboration({
    rundownId,
    onRemoteUpdate,
    enabled
  });

  return useMemo(() => ({
    isConnected
  }), [isConnected]);
};
