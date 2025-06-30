import { useOptimizedAutoSave } from './useOptimizedAutoSave';
import { useOptimizedRealtimeCollaboration } from './useOptimizedRealtimeCollaboration';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useCallback, useMemo } from 'react';

export const usePerformanceOptimizedRundown = () => {
  // Core state management (unchanged from existing)
  const rundownState = useSimplifiedRundownState();

  // Optimized auto-save with better performance
  const autoSave = useOptimizedAutoSave(
    rundownState,
    rundownState.rundownId,
    () => {
      // Mark as saved callback
      rundownState.markAsSaved?.();
    }
  );

  // Optimized realtime collaboration
  const realtime = useOptimizedRealtimeCollaboration({
    rundownId: rundownState.rundownId,
    onRemoteUpdate: () => {
      console.log('📡 Remote update received');
    },
    onReloadCurrentRundown: () => {
      // Reload rundown data
      rundownState.reloadData?.();
    },
    enabled: !!rundownState.rundownId
  });

  // Set up the connection between auto-save and realtime
  useMemo(() => {
    if (realtime.trackOwnUpdate) {
      autoSave.setTrackOwnUpdate(realtime.trackOwnUpdate);
    }
  }, [realtime.trackOwnUpdate, autoSave.setTrackOwnUpdate]);

  // Memoized user typing handler
  const handleUserTyping = useCallback((typing: boolean) => {
    autoSave.setUserTyping(typing);
  }, [autoSave.setUserTyping]);

  return {
    // Core state
    ...rundownState,
    
    // Performance-optimized features
    isSaving: autoSave.isSaving,
    isConnected: realtime.isConnected,
    onUserTyping: handleUserTyping,
    
    // Enhanced performance indicators
    performanceMode: 'optimized'
  };
};
