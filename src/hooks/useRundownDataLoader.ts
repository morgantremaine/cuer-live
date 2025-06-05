
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SavedRundown } from './useRundownStorage/types';
import { Column } from './useColumnsManager';
import { RundownItem } from '@/types/rundown';

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
  const initializationCompleteRef = useRef(false);

  useEffect(() => {
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId || loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    console.log('Data loader: Starting to load rundown', currentRundownId);
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
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

    // Load the rundown items - only if we haven't started user interactions
    if (itemsToLoad && Array.isArray(itemsToLoad)) {
      console.log('Data loader: Setting items count:', itemsToLoad.length);
      setItems(itemsToLoad);
    } else {
      console.log('Data loader: No items to load, setting empty array');
      setItems([]);
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Mark initialization as complete after a short delay to prevent interference
    setTimeout(() => {
      console.log('Data loader: Initialization complete for', currentRundownId);
      initializationCompleteRef.current = true;
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
      initializationCompleteRef.current = false;
    }
  }, [rundownId, paramId]);
};
