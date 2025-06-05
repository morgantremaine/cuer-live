
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { checkRecentAutoSave } from './useAutoSaveOperations';

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

  useEffect(() => {
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;
    
    // CRITICAL FIX: Don't load if this rundown was just auto-saved
    if (checkRecentAutoSave(currentRundownId)) {
      console.log('Data loader: Skipping load - rundown was recently auto-saved:', currentRundownId);
      return;
    }
    
    // Don't reload the same rundown unless we're actually switching
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

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

    // Load the rundown items - but only if user hasn't started interacting
    if (itemsToLoad && Array.isArray(itemsToLoad)) {
      console.log('Data loader: Setting items count:', itemsToLoad.length);
      
      // For new rundowns, delay the item loading slightly to allow user interaction to be detected
      if (!userHasInteractedRef.current) {
        // Clear any existing timer
        if (loadTimerRef.current) {
          clearTimeout(loadTimerRef.current);
        }
        
        // Increased delay to 200ms to give more time for auto-save operations to complete
        loadTimerRef.current = setTimeout(() => {
          // Only load items if user still hasn't interacted AND rundown wasn't recently auto-saved
          if (!userHasInteractedRef.current && !checkRecentAutoSave(currentRundownId)) {
            setItems(itemsToLoad);
            console.log('Data loader: Items loaded after delay');
          } else {
            console.log('Data loader: Skipping item load - user has interacted or rundown was auto-saved');
          }
          loadTimerRef.current = null;
        }, 200);
      } else {
        console.log('Data loader: Skipping item load - user already interacted');
      }
    } else {
      console.log('Data loader: No items to load, setting empty array');
      if (!userHasInteractedRef.current && !checkRecentAutoSave(currentRundownId)) {
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
    }, 100);
  }, [
    rundownId, 
    paramId, 
    savedRundowns.length,
    loading, 
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
      console.log('Data loader: Rundown ID changed, resetting loader state');
      loadedRef.current = null;
      isLoadingRef.current = false;
      userHasInteractedRef.current = false;
      
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
