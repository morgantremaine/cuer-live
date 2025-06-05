
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

  // Reset loading state when rundown ID changes - but only when truly needed
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    const currentLoadedId = loadedRef.current;
    
    // Only reset if we have a new rundown ID and it's different from what's loaded
    if (currentRundownId && currentLoadedId && currentRundownId !== currentLoadedId) {
      console.log('Data loader: Rundown ID changed from', currentLoadedId, 'to', currentRundownId);
      resetLoadingState(currentRundownId);
    }
  }, [rundownId, paramId]); // Keep dependencies minimal

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
};
