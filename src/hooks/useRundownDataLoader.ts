
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { useLoadingState } from './useRundownDataLoader/useLoadingState';
import { useLoadingEvaluation } from './useRundownDataLoader/useLoadingEvaluation';
import { getItemsToLoad } from './useRundownDataLoader/loadingUtils';
import { checkRecentAutoSave, checkUserChangedSinceAutoSave } from './useAutoSaveOperations';

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

  // Track user interactions to prevent overwriting their changes
  useEffect(() => {
    const handleUserInteraction = () => {
      userHasInteractedRef.current = true;
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Main data loading effect - optimized trigger conditions
  useEffect(() => {
    // Early returns with minimal logging
    if (loading || savedRundowns.length === 0) {
      return;
    }
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) {
      return;
    }

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) {
      return;
    }

    // Clear any existing evaluation cooldown
    if (evaluationCooldownRef.current) {
      clearTimeout(evaluationCooldownRef.current);
    }

    // Debounce the evaluation to prevent excessive calls
    evaluationCooldownRef.current = setTimeout(() => {
      if (!shouldLoadRundown(currentRundownId, rundown)) {
        console.log('Data loader: Should not load rundown - conditions not met');
        return;
      }

      console.log('Data loader: Loading rundown', currentRundownId);
      setLoadingStarted(currentRundownId);
      
      // Get items to load using extracted utility
      const itemsToLoad = getItemsToLoad(rundown);
      console.log('Data loader: Items to load:', itemsToLoad?.length || 0, 'items');
      
      // Set the rundown data
      setRundownTitle(rundown.title);
      
      if (rundown.timezone) {
        setTimezone(rundown.timezone);
      }
      
      if (rundown.start_time) {
        setRundownStartTime(rundown.start_time || '09:00:00');
      }
      
      if (rundown.columns) {
        handleLoadLayout(rundown.columns);
      }

      // Load the rundown items with validation
      if (itemsToLoad && Array.isArray(itemsToLoad)) {
        console.log('Data loader: Setting items directly with', itemsToLoad.length, 'items');
        
        // Check conditions before setting items
        const canSetItems = !userHasInteractedRef.current && 
                           !checkRecentAutoSave(currentRundownId) && 
                           !checkUserChangedSinceAutoSave(currentRundownId);
        
        console.log('Data loader: Can set items?', canSetItems, {
          userHasInteracted: userHasInteractedRef.current,
          recentAutoSave: checkRecentAutoSave(currentRundownId),
          userChangedSinceAutoSave: checkUserChangedSinceAutoSave(currentRundownId)
        });
        
        if (canSetItems) {
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
          }
          
          // Set items immediately instead of using a timer
          setItems(itemsToLoad);
          console.log('Data loader: Items set successfully');
        } else {
          console.log('Data loader: Skipping item setting due to user interaction or recent changes');
        }
      } else {
        console.log('Data loader: No items to load, setting empty array');
        if (!userHasInteractedRef.current && 
            !checkRecentAutoSave(currentRundownId) && 
            !checkUserChangedSinceAutoSave(currentRundownId)) {
          setItems([]);
        }
      }

      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }

      setLoadingComplete(currentRundownId);
    }, 100); // Reduced timeout for faster loading

  }, [
    rundownId, 
    paramId, 
    loading, 
    savedRundowns.length,
    setRundownTitle, 
    setTimezone, 
    setRundownStartTime, 
    handleLoadLayout,
    setItems,
    onRundownLoaded,
    shouldLoadRundown,
    setLoadingStarted,
    setLoadingComplete
  ]);

  // Reset loaded reference when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    resetLoadingState(currentRundownId);
  }, [rundownId, paramId, resetLoadingState]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
};
