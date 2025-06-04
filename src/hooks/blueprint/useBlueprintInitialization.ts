
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
  createItemsHash: (items: RundownItem[]) => string
) => {
  const initializationCompletedRef = useRef(false);
  const currentRundownRef = useRef<string>('');

  useEffect(() => {
    const shouldInitialize = items.length > 0 && 
                             !loading && 
                             rundownId &&
                             rundownTitle &&
                             (!initializationCompletedRef.current || currentRundownRef.current !== rundownId);

    if (shouldInitialize) {
      console.log('Initializing blueprint state with items:', items.length);
      
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
    }
  }, [rundownId, rundownTitle, items, savedBlueprint, loading, createItemsHash, setLists, setShowDate, setInitialized, setLastItemsHash]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (currentRundownRef.current !== rundownId) {
      initializationCompletedRef.current = false;
    }
  }, [rundownId]);

  return {
    initializationCompleted: initializationCompletedRef.current
  };
};
