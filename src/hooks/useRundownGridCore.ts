
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownStorage } from './useRundownStorage';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownUndo } from './useRundownUndo';
import { useTimeCalculations } from './useTimeCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { RundownItem } from '@/types/rundown';

export const useRundownGridCore = () => {
  // Router hooks
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rawId = params.id || null;

  // Improved ID validation - ensure we don't treat "new" as a valid UUID
  const rundownId = (!rawId || rawId === 'new' || rawId === ':id' || rawId.trim() === '') ? null : rawId;

  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Rundown storage
  const { savedRundowns, loading } = useRundownStorage();

  // Integrated state management (items, columns, auto-save)
  const stateIntegration = useRundownStateIntegration(
    rundownTitle,
    timezone,
    rundownStartTime
  );

  // Time calculations
  const timeCalculations = useTimeCalculations(
    stateIntegration.items,
    rundownStartTime,
    timezone
  );

  // Undo functionality
  const undoState = useRundownUndo(
    stateIntegration.items,
    stateIntegration.setItems,
    stateIntegration.markAsChanged
  );

  // Playback controls
  const playbackControls = usePlaybackControls(stateIntegration.items);

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

  // Set rundown ID when we have a valid one
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
    showColumnManager,
    setShowColumnManager,

    // Time calculations
    currentTime: timeCalculations.currentTime,
    calculateEndTime: timeCalculations.calculateEndTime,
    getRowStatus: timeCalculations.getRowStatus,

    // Undo
    handleUndo: undoState.handleUndo,
    canUndo: undoState.canUndo,
    lastAction: undoState.lastAction,

    // Playback
    isPlaying: playbackControls.isPlaying,
    timeRemaining: playbackControls.timeRemaining,
    play: playbackControls.play,
    pause: playbackControls.pause,
    forward: playbackControls.forward,
    backward: playbackControls.backward,

    // Collaboration (placeholders for now)
    isConnected: true,
    hasPendingChanges: false,
    isEditing: false,

    // Spread all the integrated state
    ...stateIntegration
  };
};
