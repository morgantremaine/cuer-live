
import { useEffect } from 'react';
import { SavedRundown } from '../useRundownStorage/types';
import { Column } from '../useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { getItemsToLoad } from './loadingUtils';

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
  // Main data loading effect
  useEffect(() => {
    // Early returns for invalid conditions
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

    // Debounce evaluations but be more responsive
    const now = Date.now();
    if (now - lastEvaluationRef.current < 500) {
      return;
    }

    console.log('Data loader: Evaluating load conditions for:', currentRundownId);

    // Check if we should load
    if (!shouldLoadRundown(currentRundownId, rundown)) {
      console.log('Data loader: Should not load rundown - conditions not met');
      return;
    }

    console.log('Data loader: Starting load process for:', currentRundownId);
    setLoadingStarted(currentRundownId);
    
    // Get items to load using the improved utility
    const itemsToLoad = getItemsToLoad(rundown);
    console.log('Data loader: Items to load:', itemsToLoad?.length || 0, 'items');
    
    try {
      // Set the rundown metadata
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

      // Load the rundown items
      if (itemsToLoad && Array.isArray(itemsToLoad)) {
        console.log('Data loader: Setting items with', itemsToLoad.length, 'items');
        
        if (loadTimerRef.current) {
          clearTimeout(loadTimerRef.current);
        }
        
        setItems(itemsToLoad);
        console.log('Data loader: setItems call completed');
      } else {
        console.log('Data loader: No valid items to load, setting empty array');
        setItems([]);
      }

      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }

      // Mark as complete after a brief delay to ensure all state updates have processed
      setTimeout(() => {
        setLoadingComplete(currentRundownId);
        console.log('Data loader: Load process completed for:', currentRundownId);
      }, 100);

    } catch (error) {
      console.error('Data loader: Error during loading process:', error);
      setLoadingComplete(currentRundownId); // Complete even on error to prevent infinite loops
    }

  }, [
    rundownId, 
    paramId, 
    loading, 
    savedRundowns.length,
    // Remove savedRundowns from dependencies to prevent reloading on every change
    // We only need to know when savedRundowns.length changes
  ]);
};
