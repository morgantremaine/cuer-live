
import { useRef } from 'react';

export const useLoadingState = () => {
  const loadedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadCompleteRef = useRef(false);
  const lastEvaluationRef = useRef<number>(0);
  const evaluationCooldownRef = useRef<NodeJS.Timeout | null>(null);

  const resetLoadingState = (currentRundownId?: string) => {
    // Only reset if we're switching to a different rundown
    if (currentRundownId && loadedRef.current !== currentRundownId) {
      console.log('Loading state: Resetting for new rundown:', currentRundownId);
      loadedRef.current = null;
      isLoadingRef.current = false;
      userHasInteractedRef.current = false;
      initialLoadCompleteRef.current = false;
      lastEvaluationRef.current = 0;
      
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
      
      if (evaluationCooldownRef.current) {
        clearTimeout(evaluationCooldownRef.current);
        evaluationCooldownRef.current = null;
      }
    }
  };

  const setLoadingComplete = (rundownId: string) => {
    console.log('Loading state: Marking as loaded:', rundownId);
    loadedRef.current = rundownId;
    setTimeout(() => {
      isLoadingRef.current = false;
      initialLoadCompleteRef.current = true;
    }, 100);
  };

  const setLoadingStarted = (rundownId: string) => {
    console.log('Loading state: Starting load for:', rundownId);
    isLoadingRef.current = true;
    userHasInteractedRef.current = false;
  };

  const cleanup = () => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }
    if (evaluationCooldownRef.current) {
      clearTimeout(evaluationCooldownRef.current);
    }
  };

  return {
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
  };
};
