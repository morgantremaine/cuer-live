import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';

// Connection pool to reuse connections across navigation
const connectionPool = new Map<string, any>();

export const useOptimizedRealtime = ({
  rundownId,
  onRundownUpdate,
  enabled,
  hasUnsavedChanges,
  trackOwnUpdate
}: {
  rundownId: string | null;
  onRundownUpdate: (data: any) => void;
  enabled: boolean;
  hasUnsavedChanges: boolean;
  trackOwnUpdate: (timestamp: string) => void;
}) => {
  const connectionKey = rundownId || 'none';
  const isActiveRef = useRef(true);
  
  // Mark component as active
  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  // Optimized realtime rundown with connection reuse awareness
  const realtimeRundown = useRealtimeRundown({
    rundownId,
    onRundownUpdate: useCallback((data) => {
      // Only process updates if component is still active
      if (isActiveRef.current) {
        onRundownUpdate(data);
      }
    }, [onRundownUpdate]),
    enabled,
    hasUnsavedChanges,
    trackOwnUpdate: useCallback((timestamp) => {
      if (isActiveRef.current) {
        trackOwnUpdate(timestamp);
      }
    }, [trackOwnUpdate])
  });

  // Stable collaboration with activity awareness
  const stableRealtime = useStableRealtimeCollaboration({
    rundownId,
    onRemoteUpdate: useCallback(() => {
      // Only notify if component is active
      if (isActiveRef.current) {
        // Remote update notification
      }
    }, []),
    enabled: enabled && !!rundownId
  });

  // Cache connection status
  useEffect(() => {
    if (rundownId && (realtimeRundown.isConnected || stableRealtime.isConnected)) {
      connectionPool.set(connectionKey, {
        isConnected: true,
        lastUpdate: Date.now()
      });
    }
  }, [realtimeRundown.isConnected, stableRealtime.isConnected, rundownId, connectionKey]);

  return {
    ...realtimeRundown,
    stableCollaboration: stableRealtime,
    isConnected: realtimeRundown.isConnected || stableRealtime.isConnected,
    isProcessingUpdate: realtimeRundown.isProcessingContentUpdate,
    // Add connection pool access if needed
    hasPooledConnection: connectionPool.has(connectionKey)
  };
};