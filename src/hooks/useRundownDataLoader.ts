
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

  // Track user interactions to prevent overwriting their changes
  useEffect(() => {
    const handleUserInteraction = () => {
      userHasInteractedRef.current = true;
    };

    // Listen for user interactions that indicate they've started working
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Helper function to validate if loading should proceed
  const shouldLoadRundown = (currentRundownId: string, rundown: SavedRundown) => {
    console.log('Data loader: Evaluating load conditions for:', currentRundownId);

    // First safeguard: Recent auto-save protection
    if (checkRecentAutoSave(currentRundownId)) {
      console.log('Data loader: BLOCKED - rundown was recently auto-saved:', currentRundownId);
      return false;
    }

    // Second safeguard: User interaction detection
    if (userHasInteractedRef.current) {
      console.log('Data loader: BLOCKED - user has already interacted');
      return false;
    }

    // Third safeguard: User changes since auto-save
    if (checkUserChangedSinceAutoSave(currentRundownId)) {
      console.log('Data loader: BLOCKED - user has made changes since auto-save');
      return false;
    }

    // Fourth safeguard: Already loaded this rundown
    if (loadedRef.current === currentRundownId && initialLoadCompleteRef.current) {
      console.log('Data loader: BLOCKED - rundown already loaded and initialization complete');
      return false;
    }

    // Fifth safeguard: Currently loading
    if (isLoadingRef.current) {
      console.log('Data loader: BLOCKED - already loading');
      return false;
    }

    console.log('Data loader: PROCEEDING - all safeguards passed for:', currentRundownId);
    return true;
  };

  // Main data loading effect - refined trigger conditions
  useEffect(() => {
    if (loading || savedRundowns.length === 0) {
      console.log('Data loader: Waiting for storage to be ready');
      return;
    }
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) {
      console.log('Data loader: No rundown ID available');
      return;
    }

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) {
      console.log('Data loader: Rundown not found in storage:', currentRundownId);
      return;
    }

    // Apply comprehensive validation before loading
    if (!shouldLoadRundown(currentRundownId, rundown)) {
      return;
    }

    console.log('Data loader: Starting to load rundown', currentRundownId);
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
    // Reset user interaction flag for new rundown
    userHasInteractedRef.current = false;
    
    // Check undo history for items if main items array is empty
    let itemsToLoad = rundown.items || [];
    
    if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
      console.log('Data loader: Looking for items in undo history');
      // Look through undo history to find the most recent state with items
      for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
        const historyEntry = rundown.undo_history[i];
        
        if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
          itemsToLoad = historyEntry.items;
          console.log('Data loader: Found items in undo history entry', i, 'with', itemsToLoad.length, 'items');
          break;
        }
      }
    }
    
    console.log('Data loader: Setting rundown data for', currentRundownId);
    
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

    // Load the rundown items with additional validation
    if (itemsToLoad && Array.isArray(itemsToLoad)) {
      console.log('Data loader: Setting items count:', itemsToLoad.length);
      
      // Clear any existing timer
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
      
      // Reduced delay to 100ms but with more comprehensive checks
      loadTimerRef.current = setTimeout(() => {
        // Final validation before loading items
        if (!userHasInteractedRef.current && 
            !checkRecentAutoSave(currentRundownId) && 
            !checkUserChangedSinceAutoSave(currentRundownId)) {
          setItems(itemsToLoad);
          console.log('Data loader: Items loaded after delay');
        } else {
          console.log('Data loader: FINAL BLOCK - conditions changed during delay');
        }
        loadTimerRef.current = null;
      }, 100);
    } else {
      console.log('Data loader: No items to load, setting empty array');
      if (!userHasInteractedRef.current && 
          !checkRecentAutoSave(currentRundownId) && 
          !checkUserChangedSinceAutoSave(currentRundownId)) {
        setItems([]);
      }
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Mark initialization as complete
    setTimeout(() => {
      console.log('Data loader: Initialization complete for', currentRundownId);
      isLoadingRef.current = false;
      initialLoadCompleteRef.current = true;
    }, 150);
  }, [
    rundownId, 
    paramId, 
    // Removed savedRundowns.length from dependencies to prevent problematic re-runs
    loading, 
    setRundownTitle, 
    setTimezone, 
    setRundownStartTime, 
    handleLoadLayout,
    setItems,
    onRundownLoaded
  ]);

  // Reset loaded reference when rundown ID changes (genuine navigation)
  useEffect(() => {
    const currentRundownId = rundownId || paramId;
    if (loadedRef.current && loadedRef.current !== currentRundownId) {
      console.log('Data loader: Rundown ID changed, resetting loader state from', loadedRef.current, 'to', currentRundownId);
      loadedRef.current = null;
      isLoadingRef.current = false;
      userHasInteractedRef.current = false;
      initialLoadCompleteRef.current = false;
      
      // Clear any pending timer
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    }
  }, [rundownId, paramId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, []);
};
