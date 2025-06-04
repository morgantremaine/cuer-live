
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

  useEffect(() => {
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId || loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) return;

    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
    // Check undo history for items if main items array is empty
    let itemsToLoad = rundown.items || [];
    
    if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
      // Look through undo history to find the most recent state with items
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

    // Load the rundown items
    if (itemsToLoad && Array.isArray(itemsToLoad)) {
      setItems(itemsToLoad);
    } else {
      setItems([]);
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Reset loading flag
    setTimeout(() => {
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
      loadedRef.current = null;
      isLoadingRef.current = false;
    }
  }, [rundownId, paramId]);
};
