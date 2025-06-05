
import { useCallback } from 'react';
import { SavedRundown } from '../useRundownStorage/types';
import { validateLoadingConditions } from './loadingUtils';

interface UseLoadingEvaluationProps {
  userHasInteractedRef: React.MutableRefObject<boolean>;
  loadedRef: React.MutableRefObject<string | null>;
  initialLoadCompleteRef: React.MutableRefObject<boolean>;
  isLoadingRef: React.MutableRefObject<boolean>;
  lastEvaluationRef: React.MutableRefObject<number>;
}

export const useLoadingEvaluation = ({
  userHasInteractedRef,
  loadedRef,
  initialLoadCompleteRef,
  isLoadingRef,
  lastEvaluationRef
}: UseLoadingEvaluationProps) => {
  
  const shouldLoadRundown = useCallback((currentRundownId: string, rundown: SavedRundown) => {
    const now = Date.now();
    
    // Increased debounce time to prevent excessive evaluations
    if (now - lastEvaluationRef.current < 3000) {
      return false;
    }
    lastEvaluationRef.current = now;

    const validation = validateLoadingConditions(
      currentRundownId,
      rundown,
      userHasInteractedRef.current,
      loadedRef.current,
      initialLoadCompleteRef.current,
      isLoadingRef.current
    );

    return validation.shouldLoad;
  }, [userHasInteractedRef, loadedRef, initialLoadCompleteRef, isLoadingRef, lastEvaluationRef]);

  return { shouldLoadRundown };
};
