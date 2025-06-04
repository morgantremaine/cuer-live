
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
  const lastSavedBlueprintRef = useRef<string>('');
  const initializationTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any pending initialization when dependencies change
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Skip if we're currently updating checkboxes
    if (isUpdatingCheckboxes.current) {
      console.log('Skipping initialization - checkboxes are being updated');
      // Schedule re-initialization after checkbox update completes
      initializationTimeoutRef.current = setTimeout(() => {
        if (!isUpdatingCheckboxes.current) {
          hasInitialized.current = false;
        }
      }, 3000);
      return;
    }

    // Only initialize once per rundown/blueprint combination
    const blueprintKey = `${rundownId}-${savedBlueprint?.id || 'new'}`;
    
    if (items.length > 0 && !loading && !hasInitialized.current) {
      console.log('Initializing blueprint state with items:', items.length);
      
      // Check if we have a saved blueprint that's different from what we last processed
      const currentBlueprintData = JSON.stringify(savedBlueprint?.lists || []);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        
        // Only reload if the blueprint data has actually changed
        if (currentBlueprintData !== lastSavedBlueprintRef.current) {
          const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => ({
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            checkedItems: list.checkedItems || {}
          }));
          setLists(refreshedLists);
          console.log('Loaded lists with preserved checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
          lastSavedBlueprintRef.current = currentBlueprintData;
        }
        
        if (savedBlueprint.show_date) {
          setShowDate(savedBlueprint.show_date);
        }
      } else {
        console.log('Generating default blueprint');
        setLists(generateDefaultBlueprint(rundownId, rundownTitle, items));
        lastSavedBlueprintRef.current = currentBlueprintData;
      }
      
      setLastItemsHash(createItemsHash(items));
      setInitialized(true);
      hasInitialized.current = true;
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId, rundownTitle, items, savedBlueprint?.id, savedBlueprint?.lists, loading, createItemsHash, setLists, setShowDate, setInitialized, setLastItemsHash]);

  // Reset initialization when rundown changes
  useEffect(() => {
    return () => {
      // Reset when component unmounts or rundown changes
      hasInitialized.current = false;
      lastSavedBlueprintRef.current = '';
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId, savedBlueprint?.id]);

  return {
    isUpdatingCheckboxes,
    hasInitialized
  };
};
