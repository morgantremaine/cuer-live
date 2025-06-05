
import { useEffect } from 'react';
import { SavedRundown } from '../useRundownStorage/types';
import { Column } from '../useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { getItemsToLoad } from './loadingUtils';
import { checkRecentAutoSave, checkUserChangedSinceAutoSave } from '../useAutoSaveOperations';

interface UseDataLoadingEffectProps {
  rundownId?: string;
  paramId?: string;
  loading: boolean;
  savedRundowns: SavedRundown[];
  shouldLoadRundown: (currentRundownId: string, rundown: SavedRundown) => boolean;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  setItems: (items: RundownItem[]) => void;
  onRundownLoaded?: (rundown: SavedRundown) => void;
  userHasInteractedRef: React.MutableRefObject<boolean>;
  loadTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  evaluationCooldownRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastEvaluationRef: React.MutableRefObject<number>;
  setLoadingStarted: (rundownId: string) => void;
  setLoadingComplete: (rundownId: string) => void;
}

export const useDataLoadingEffect = ({
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
}: UseDataLoadingEffectProps) => {
  // Main data loading effect - only run when we have valid conditions
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
      console.log('Data loader: No rundown found for ID:', currentRundownId);
      return;
    }

    // Clear any existing evaluation cooldown
    if (evaluationCooldownRef.current) {
      clearTimeout(evaluationCooldownRef.current);
    }

    // Only evaluate if enough time has passed since last evaluation
    const now = Date.now();
    if (now - lastEvaluationRef.current < 2000) {
      return;
    }

    console.log('Data loader: Evaluating load conditions for:', currentRundownId);

    // Debounce the evaluation
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
        
        if (canSetItems) {
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
          }
          
          console.log('Data loader: About to call setItems with:', itemsToLoad.length, 'items');
          setItems(itemsToLoad);
          console.log('Data loader: setItems call completed');
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
    }, 500); // Reduced timeout for more responsive loading

  }, [
    rundownId, 
    paramId, 
    loading, 
    savedRundowns.length // Only depend on length to avoid triggering on every array change
  ]); // Simplified dependencies to prevent constant re-triggers
};
