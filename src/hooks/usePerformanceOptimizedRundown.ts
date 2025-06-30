import { useOptimizedAutoSave } from './useOptimizedAutoSave';
import { useOptimizedRealtimeCollaboration } from './useOptimizedRealtimeCollaboration';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useCallback, useMemo } from 'react';

export const usePerformanceOptimizedRundown = () => {
  // Core state management (unchanged from existing)
  const rundownState = useSimplifiedRundownState();

  // Create a compatible state object for the auto-save hook
  const autoSaveState = useMemo(() => ({
    items: rundownState.items || [],
    title: rundownState.rundownTitle || '',
    startTime: rundownState.rundownStartTime || '',
    timezone: rundownState.timezone || '',
    hasUnsavedChanges: rundownState.hasUnsavedChanges || false,
    lastChanged: Date.now(),
    // Add missing required properties
    columns: rundownState.columns || [],
    currentSegmentId: null,
    isPlaying: false
  }), [
    rundownState.items,
    rundownState.rundownTitle,
    rundownState.rundownStartTime,
    rundownState.timezone,
    rundownState.hasUnsavedChanges,
    rundownState.columns
  ]);

  // Optimized auto-save with better performance
  const autoSave = useOptimizedAutoSave(
    autoSaveState,
    rundownState.rundownId,
    () => {
      // Mark as saved callback - just a simple callback since the auto-save will handle state
      console.log('📡 Rundown saved successfully');
    }
  );

  // Optimized realtime collaboration
  const realtime = useOptimizedRealtimeCollaboration({
    rundownId: rundownState.rundownId,
    onRemoteUpdate: () => {
      console.log('📡 Remote update received');
    },
    onReloadCurrentRundown: () => {
      // Reload rundown data - trigger a re-fetch if available
      console.log('📡 Reloading rundown data');
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
