
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
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      loadedRef.current = null;
      isLoadingRef.current = false;
      userHasInteractedRef.current = false;
      initialLoadCompleteRef.current = false;
      
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
    loadedRef.current = rundownId;
    setTimeout(() => {
      isLoadingRef.current = false;
      initialLoadCompleteRef.current = true;
    }, 100);
  };

  const setLoadingStarted = (rundownId: string) => {
    isLoadingRef.current = true;
    loadedRef.current = rundownId;
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
