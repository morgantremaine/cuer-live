
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
  const lastInitializedRundownRef = useRef<string>('');

  useEffect(() => {
    // Clear any pending initialization when dependencies change
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Skip if we're currently updating checkboxes
    if (isUpdatingCheckboxes.current) {
      console.log('Skipping initialization - checkboxes are being updated');
      return;
    }

    // Create a unique key for this rundown/blueprint combination
    const currentKey = `${rundownId}-${savedBlueprint?.id || 'new'}`;
    
    // Only initialize if this is a truly new rundown or the first time for this combination
    const shouldInitialize = items.length > 0 && 
                             !loading && 
                             (!hasInitialized.current || lastInitializedRundownRef.current !== currentKey);

    if (shouldInitialize) {
      console.log('Initializing blueprint state with items:', items.length);
      
      // Check if we have a saved blueprint
      const currentBlueprintData = JSON.stringify(savedBlueprint?.lists || []);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        
        // Only reload if we haven't processed this blueprint data before OR if it's a different rundown
        if (currentBlueprintData !== lastSavedBlueprintRef.current || lastInitializedRundownRef.current !== currentKey) {
          const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => ({
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            checkedItems: list.checkedItems || {}
          }));
          setLists(refreshedLists);
          console.log('Loaded lists with preserved checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
          lastSavedBlueprintRef.current = currentBlueprintData;
        } else {
          console.log('Skipping blueprint reload - same data already loaded');
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
      lastInitializedRundownRef.current = currentKey;
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
      // Only reset when component unmounts, not on every dependency change
      hasInitialized.current = false;
      lastSavedBlueprintRef.current = '';
      lastInitializedRundownRef.current = '';
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId]);

  return {
    isUpdatingCheckboxes,
    hasInitialized
  };
};
