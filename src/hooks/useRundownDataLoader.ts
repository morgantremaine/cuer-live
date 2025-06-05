
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';
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
  const loadedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadCompleteRef = useRef(false);
  const lastEvaluationRef = useRef<number>(0);
  const evaluationCooldownRef = useRef<NodeJS.Timeout | null>(null);

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

  // Helper function to validate if loading should proceed - with debouncing
  const shouldLoadRundown = (currentRundownId: string, rundown: SavedRundown) => {
    const now = Date.now();
    
    // Debounce evaluations to prevent excessive logging
    if (now - lastEvaluationRef.current < 1000) {
      return false;
    }
    lastEvaluationRef.current = now;

    // Critical safeguards only - reduced logging
    if (checkRecentAutoSave(currentRundownId)) {
      return false;
    }

    if (userHasInteractedRef.current) {
      return false;
    }

    if (checkUserChangedSinceAutoSave(currentRundownId)) {
      return false;
    }

    if (loadedRef.current === currentRundownId && initialLoadCompleteRef.current) {
      return false;
    }

    if (isLoadingRef.current) {
      return false;
    }

    return true;
  };

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
        return;
      }

      console.log('Data loader: Loading rundown', currentRundownId);
      isLoadingRef.current = true;
      loadedRef.current = currentRundownId;
      
      userHasInteractedRef.current = false;
      
      // Check undo history for items if main items array is empty
      let itemsToLoad = rundown.items || [];
      
      if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
        for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
          const historyEntry = rundown.undo_history[i];
          
          if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
            itemsToLoad = historyEntry.items;
            break;
          }
        }
      }
      
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
        if (loadTimerRef.current) {
          clearTimeout(loadTimerRef.current);
        }
        
        loadTimerRef.current = setTimeout(() => {
          if (!userHasInteractedRef.current && 
              !checkRecentAutoSave(currentRundownId) && 
              !checkUserChangedSinceAutoSave(currentRundownId)) {
            setItems(itemsToLoad);
          }
          loadTimerRef.current = null;
        }, 50); // Reduced delay
      } else {
        if (!userHasInteractedRef.current && 
            !checkRecentAutoSave(currentRundownId) && 
            !checkUserChangedSinceAutoSave(currentRundownId)) {
          setItems([]);
        }
      }

      if (onRundownLoaded) {
        onRundownLoaded(rundown);
      }

      setTimeout(() => {
        isLoadingRef.current = false;
        initialLoadCompleteRef.current = true;
      }, 100);
    }, 500); // Debounce evaluations by 500ms

  }, [
    rundownId, 
    paramId, 
    loading, 
    savedRundowns.length, // Only re-run when length actually changes
    setRundownTitle, 
    setTimezone, 
    setRundownStartTime, 
    handleLoadLayout,
    setItems,
    onRundownLoaded
  ]);

  // Reset loaded reference when rundown ID changes
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
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
  }, [rundownId, paramId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
      if (evaluationCooldownRef.current) {
        clearTimeout(evaluationCooldownRef.current);
      }
    };
  }, []);
};
