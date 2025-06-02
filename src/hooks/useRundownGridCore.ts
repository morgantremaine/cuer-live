
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useMemo, useRef, useEffect } from 'react';

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

  // Store stable references to prevent re-renders
  const stableRefs = useRef({
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly
  });

  // Update refs when functions change
  useEffect(() => {
    stableRefs.current = {
      setRundownTitleDirectly,
      setTimezoneDirectly,
      setRundownStartTimeDirectly
    };
  }, [setRundownTitleDirectly, setTimezoneDirectly, setRundownStartTimeDirectly]);

  // Rundown data integration - only run when initialized
  const stateIntegration = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    stableRefs.current.setRundownTitleDirectly, 
    stableRefs.current.setTimezoneDirectly
  );

  // Use data loader to properly set title, timezone, and start time - only when initialized
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    isInitialized,
    setRundownTitle: stableRefs.current.setRundownTitleDirectly,
    setTimezone: stableRefs.current.setTimezoneDirectly,
    setRundownStartTime: stableRefs.current.setRundownStartTimeDirectly,
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
