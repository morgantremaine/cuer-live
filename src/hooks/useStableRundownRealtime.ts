
import { useMemo, useCallback, useRef } from 'react';
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
  const stablePropsRef = useRef({ rundownId, enabled });
  
  // Only update ref if props actually changed
  if (stablePropsRef.current.rundownId !== rundownId || stablePropsRef.current.enabled !== enabled) {
    stablePropsRef.current = { rundownId, enabled };
  }

  // Stable callback for remote updates
  const onRemoteUpdate = useCallback(() => {
    console.log('📡 Remote update detected, refreshing rundowns...');
    loadRundowns();
  }, [loadRundowns]);

  // Use realtime collaboration with stable props
  const { isConnected } = useRealtimeCollaboration({
    rundownId: stablePropsRef.current.rundownId,
    onRemoteUpdate,
    enabled: stablePropsRef.current.enabled
  });

  return useMemo(() => ({
    isConnected
  }), [isConnected]);
};
