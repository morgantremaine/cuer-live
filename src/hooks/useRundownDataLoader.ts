
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { useLoadingState } from './useRundownDataLoader/useLoadingState';
import { useLoadingEvaluation } from './useRundownDataLoader/useLoadingEvaluation';
import { useUserInteractionTracking } from './useRundownDataLoader/useUserInteractionTracking';
import { useDataLoadingEffect } from './useRundownDataLoader/useDataLoadingEffect';

interface UseRundownDataLoaderProps {
  rundownId?: string;
  savedRundowns: SavedRundown[];
  loading: boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
}

export const useRundownDataLoader = ({
  rundownId,
  savedRundowns,
  loading,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout,
  setItems,
  onRundownLoaded
}: UseRundownDataLoaderProps) => {
  const params = useParams<{ id: string }>();
  const paramId = params.id;
  
  const {
    loadedRef,
    isLoadingRef,
    userHasInteractedRef,
    loadTimerRef,
    initialLoadCompleteRef,
    lastEvaluationRef,
    evaluationCooldownRef,
    resetLoadingState,
    setLoadingComplete,
    setLoadingStarted,
    cleanup
  } = useLoadingState();

  const { shouldLoadRundown } = useLoadingEvaluation({
    userHasInteractedRef,
    loadedRef,
    initialLoadCompleteRef,
    isLoadingRef,
    lastEvaluationRef
  });

  // Track user interactions
  useUserInteractionTracking({ userHasInteractedRef });

  // Main data loading effect
  useDataLoadingEffect({
    rundownId,
    paramId,
    loading,
    savedRundowns,
    shouldLoadRundown,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout,
    setItems,
    onRundownLoaded,
    userHasInteractedRef,
    loadTimerRef,
    evaluationCooldownRef,
    lastEvaluationRef,
    setLoadingStarted,
    setLoadingComplete
  });

  // Reset loaded reference when rundown ID changes - but less frequently
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current !== currentRundownId) {
      console.log('Data loader: Resetting loading state for rundown ID change:', currentRundownId);
      resetLoadingState(currentRundownId);
    }
  }, [rundownId, paramId, resetLoadingState, loadedRef]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
};
