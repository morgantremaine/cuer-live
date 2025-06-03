
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
  const hasInitialized = useRef(false);
  const isUpdatingCheckboxes = useRef(false);

  useEffect(() => {
    if (isUpdatingCheckboxes.current) {
      return;
    }

    if (items.length > 0 && !loading && !hasInitialized.current) {
      console.log('Initializing blueprint state with items:', items.length);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
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
      hasInitialized.current = true;
    }
  }, [rundownId, rundownTitle, items, savedBlueprint, loading, createItemsHash, setLists, setShowDate, setInitialized, setLastItemsHash]);

  return {
    isUpdatingCheckboxes,
    hasInitialized
  };
};
