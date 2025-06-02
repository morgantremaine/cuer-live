
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useMemo, useRef } from 'react';

export const useRundownGridCore = () => {
  // Core state management
  const basicState = useRundownBasicState();
  
  const {
    currentTime,
    timezone,
    setTimezone,
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime,
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged,
    isInitialized
  } = basicState;

  // Get storage data for the data loader
  const { savedRundowns, loading } = useRundownStorage();

  // Store stable references to prevent re-renders - use ref for true stability
  const stableSettersRef = useRef({
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly
  });

  // Only update if functions actually changed
  if (stableSettersRef.current.setRundownTitleDirectly !== setRundownTitleDirectly) {
    stableSettersRef.current.setRundownTitleDirectly = setRundownTitleDirectly;
  }
  if (stableSettersRef.current.setTimezoneDirectly !== setTimezoneDirectly) {
    stableSettersRef.current.setTimezoneDirectly = setTimezoneDirectly;
  }
  if (stableSettersRef.current.setRundownStartTimeDirectly !== setRundownStartTimeDirectly) {
    stableSettersRef.current.setRundownStartTimeDirectly = setRundownStartTimeDirectly;
  }

  // Rundown data integration - only run when initialized
  const stateIntegration = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    stableSettersRef.current.setRundownTitleDirectly, 
    stableSettersRef.current.setTimezoneDirectly
  );

  // Use data loader to properly set title, timezone, and start time - only when initialized
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    isInitialized,
    setRundownTitle: stableSettersRef.current.setRundownTitleDirectly,
    setTimezone: stableSettersRef.current.setTimezoneDirectly,
    setRundownStartTime: stableSettersRef.current.setRundownStartTimeDirectly,
    handleLoadLayout: stateIntegration.handleLoadLayout
  });

  // Playback controls
  const playbackControls = usePlaybackControls(stateIntegration.items, stateIntegration.updateItem);

  // Time calculations
  const timeCalculations = useTimeCalculations(stateIntegration.items, stateIntegration.updateItem, rundownStartTime);

  // Memoize the entire return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,

    // State integration
    ...stateIntegration,

    // Playback
    ...playbackControls,

    // Time calculations
    ...timeCalculations
  }), [
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,
    stateIntegration,
    playbackControls,
    timeCalculations
  ]);
};
