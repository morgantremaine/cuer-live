
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
    // Only proceed if we have rundowns loaded and a specific rundown ID
    if (loading || savedRundowns.length === 0 || isLoadingRef.current) return;
    
    const currentRundownId = rundownId || paramId;
    if (!currentRundownId) return;

    // Prevent loading the same rundown multiple times
    if (loadedRef.current === currentRundownId) return;

    const rundown = savedRundowns.find(r => r.id === currentRundownId);
    if (!rundown) {
      console.log('Rundown not found:', currentRundownId);
      console.log('Available rundowns:', savedRundowns.map(r => ({ id: r.id, title: r.title })));
      return;
    }

    console.log('Loading rundown data:', rundown.title);
    console.log('Full rundown object:', rundown);
    
    // Check undo history for items if main items array is empty
    let itemsToLoad = rundown.items || [];
    
    if ((!itemsToLoad || itemsToLoad.length === 0) && rundown.undo_history && Array.isArray(rundown.undo_history) && rundown.undo_history.length > 0) {
      console.log('Main items array is empty, checking undo history for items...');
      console.log('Undo history length:', rundown.undo_history.length);
      
      // Look through undo history to find the most recent state with items
      for (let i = rundown.undo_history.length - 1; i >= 0; i--) {
        const historyEntry = rundown.undo_history[i];
        console.log(`Checking undo history entry ${i}:`, historyEntry);
        
        if (historyEntry && historyEntry.items && Array.isArray(historyEntry.items) && historyEntry.items.length > 0) {
          console.log(`Found items in undo history entry ${i}:`, historyEntry.items.length, 'items');
          itemsToLoad = historyEntry.items;
          break;
        }
      }
    }

    console.log('Items to load:', {
      items: itemsToLoad,
      itemsType: typeof itemsToLoad,
      isArray: Array.isArray(itemsToLoad),
      itemsLength: itemsToLoad?.length,
      firstItem: itemsToLoad?.[0]
    });
    
    // Mark as loading and loaded to prevent loops
    isLoadingRef.current = true;
    loadedRef.current = currentRundownId;
    
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

    // Load the rundown items (either from main array or recovered from undo history)
    if (itemsToLoad && Array.isArray(itemsToLoad)) {
      console.log('Setting items:', itemsToLoad);
      setItems(itemsToLoad);
      if (itemsToLoad.length === 0) {
        console.log('Warning: No items found in rundown or undo history');
      } else {
        console.log(`Successfully loaded ${itemsToLoad.length} items`);
      }
    } else {
      console.error('Items is not an array:', typeof itemsToLoad, itemsToLoad);
      setItems([]);
    }

    // Call the callback with the loaded rundown
    if (onRundownLoaded) {
      onRundownLoaded(rundown);
    }

    // Reset loading flag after a short delay
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [
    rundownId, 
    paramId, 
    savedRundowns,
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
