
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownStorage } from './useRundownStorage';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownUndo } from './useRundownUndo';
import { useTimeCalculations } from './useTimeCalculations';
import { RundownItem } from '@/types/rundown';

export const useRundownGridCore = () => {
  // Router hooks
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rundownId = params.id || null;

  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);

  // Rundown storage
  const { savedRundowns, loading } = useRundownStorage();

  // Integrated state management (items, columns, auto-save)
  const stateIntegration = useRundownStateIntegration(
    rundownTitle,
    timezone,
    rundownStartTime
  );

  // Time calculations
  const { currentTime, calculateEndTime } = useTimeCalculations(
    stateIntegration.items,
    rundownStartTime,
    timezone
  );

  // Undo functionality
  const { handleUndo, canUndo, lastAction } = useRundownUndo(
    stateIntegration.items,
    stateIntegration.setItems,
    stateIntegration.markAsChanged
  );

  // Data loading
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout: stateIntegration.handleLoadLayout,
    setItems: stateIntegration.setItems,
    onRundownLoaded: (rundown) => {
      console.log('🎯 Rundown loaded:', rundown.title);
      stateIntegration.setRundownId(rundown.id);
    }
  });

  // Handle rundown creation
  useEffect(() => {
    stateIntegration.setOnRundownCreated((newRundownId: string) => {
      console.log('🆕 New rundown created, updating URL to:', newRundownId);
      stateIntegration.setRundownId(newRundownId);
      // Update URL without reload
      navigate(`/${newRundownId}`, { replace: true });
    });
  }, [stateIntegration.setOnRundownCreated, stateIntegration.setRundownId, navigate]);

  // Set rundown ID when we have one
  useEffect(() => {
    if (rundownId) {
      stateIntegration.setRundownId(rundownId);
    }
  }, [rundownId, stateIntegration.setRundownId]);

  return {
    // Basic state
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    currentSegmentId,
    setCurrentSegmentId,
    rundownId,
    currentTime,

    // Calculations
    calculateEndTime,

    // Undo
    handleUndo,
    canUndo,
    lastAction,

    // Spread all the integrated state
    ...stateIntegration
  };
};
