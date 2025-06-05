
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
  setIsLoading?: (loading: boolean) => void; // Add this for change tracking coordination
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
  onRundownLoaded,
  setIsLoading
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

  // Notify change tracking when we start/stop loading
  useEffect(() => {
    if (setIsLoading) {
      setIsLoading(isLoadingRef.current);
    }
  }, [setIsLoading]);

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
    setLoadingStarted: (id: string) => {
      setLoadingStarted(id);
      if (setIsLoading) setIsLoading(true);
    },
    setLoadingComplete: (id: string) => {
      setLoadingComplete(id);
      if (setIsLoading) setIsLoading(false);
    }
  });

  // Reset loading state when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    const currentLoadedId = loadedRef.current;
    
    // Only reset if we have a new rundown ID and it's different from what's loaded
    if (currentRundownId && currentLoadedId && currentRundownId !== currentLoadedId) {
      console.log('Data loader: Rundown ID changed from', currentLoadedId, 'to', currentRundownId);
      resetLoadingState(currentRundownId);
    }
  }, [rundownId, paramId, resetLoadingState]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Return a flag to indicate if data loader is active for this rundown
  return {
    isDataLoaderActive: Boolean(rundownId || paramId),
    isLoading: isLoadingRef.current
  };
};
