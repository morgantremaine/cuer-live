import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  
  // Handle tab visibility to prevent unnecessary operations
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);
      
      console.log('🔄 Tab visibility changed:', isVisible ? 'visible' : 'hidden');
      
      // When tab becomes visible, mark as active for processing updates
      if (isVisible) {
        isActiveRef.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Mark component as active (enhanced with tab visibility)
  useEffect(() => {
    isActiveRef.current = isTabVisible;
    return () => {
      isActiveRef.current = false;
    };
  }, [isTabVisible]);

  // Optimized realtime rundown with connection reuse awareness
  const realtimeRundown = useRealtimeRundown({
    rundownId,
    onRundownUpdate: useCallback((data) => {
      // Only process updates if component is still active and tab is visible
      if (isActiveRef.current && isTabVisible) {
        onRundownUpdate(data);
      } else {
        console.log('🚫 Skipping rundown update - tab not visible or component inactive');
      }
    }, [onRundownUpdate, isTabVisible]),
    enabled: enabled && isTabVisible, // Only enable when tab is visible
    hasUnsavedChanges,
    trackOwnUpdate: useCallback((timestamp) => {
      if (isActiveRef.current && isTabVisible) {
        trackOwnUpdate(timestamp);
      }
    }, [trackOwnUpdate, isTabVisible])
  });

  // Stable collaboration with activity awareness
  const stableRealtime = useStableRealtimeCollaboration({
    rundownId,
    onRemoteUpdate: useCallback(() => {
      // Only notify if component is active and tab is visible
      if (isActiveRef.current && isTabVisible) {
        // Remote update notification
      }
    }, [isTabVisible]),
    enabled: enabled && !!rundownId && isTabVisible // Only enable when tab is visible
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
    isTabVisible,
    // Add connection pool access if needed
    hasPooledConnection: connectionPool.has(connectionKey)
  };
};