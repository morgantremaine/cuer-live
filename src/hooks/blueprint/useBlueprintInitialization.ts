
import { useState, useCallback, useRef, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, generateDefaultBlueprint } from '@/utils/blueprintUtils';

export const useBlueprintInitialization = (
  rundownId: string,
  rundownTitle: string,
  items: RundownItem[],
  savedBlueprint: any,
  loading: boolean,
  setLists: (lists: BlueprintList[]) => void,
  setShowDate: (date: string) => void,
  setInitialized: (initialized: boolean) => void,
  setLastItemsHash: (hash: string) => void,
  createItemsHash: (items: RundownItem[]) => string,
  hasPendingSave?: boolean
) => {
  const initializationCompletedRef = useRef(false);
  const currentRundownRef = useRef<string>('');
  const initializationInProgressRef = useRef(false);

  useEffect(() => {
    // Don't initialize if there's a pending save operation
    if (hasPendingSave) {
      console.log('Skipping initialization - save operation in progress');
      return;
    }

    // Don't initialize if already in progress
    if (initializationInProgressRef.current) {
      console.log('Skipping initialization - already in progress');
      return;
    }

    const shouldInitialize = items.length > 0 && 
                             !loading && 
                             rundownId &&
                             rundownTitle &&
                             (!initializationCompletedRef.current || currentRundownRef.current !== rundownId);

    if (shouldInitialize) {
      initializationInProgressRef.current = true;
      console.log('Initializing blueprint state with items:', items.length);
      
      // Add a small delay to ensure any pending saves complete first
      setTimeout(() => {
        if (savedBlueprint && savedBlueprint.lists.length > 0) {
          console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
          
          // Refresh list items with current rundown data but preserve checkbox states
          const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => ({
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            // CRITICAL: Preserve the exact checkbox states from saved blueprint
            checkedItems: list.checkedItems || {}
          }));
          
          setLists(refreshedLists);
          console.log('Loaded lists with preserved checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
          
          if (savedBlueprint.show_date) {
            setShowDate(savedBlueprint.show_date);
          }
        } else {
          console.log('Generating default blueprint');
          setLists(generateDefaultBlueprint(rundownId, rundownTitle, items));
        }
        
        setLastItemsHash(createItemsHash(items));
        setInitialized(true);
        initializationCompletedRef.current = true;
        currentRundownRef.current = rundownId;
        initializationInProgressRef.current = false;
      }, 100);
    }
  }, [rundownId, rundownTitle, items, savedBlueprint, loading, createItemsHash, setLists, setShowDate, setInitialized, setLastItemsHash, hasPendingSave]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (currentRundownRef.current !== rundownId) {
      initializationCompletedRef.current = false;
      initializationInProgressRef.current = false;
    }
  }, [rundownId]);

  return {
    initializationCompleted: initializationCompletedRef.current
  };
};
