
import { useState, useCallback, useRef, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintCheckboxManager = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  saveBlueprint: (title: string, lists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>
) => {
  // This is the single source of truth for checkbox states
  const checkboxStatesRef = useRef<Map<string, Record<string, boolean>>>(new Map());
  const [isUpdating, setIsUpdating] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const latestListsRef = useRef<BlueprintList[]>([]);

  // Initialize checkbox states from saved blueprint data
  const initializeCheckboxStates = useCallback((lists: BlueprintList[]) => {
    // CRITICAL: Only initialize if we don't have pending saves
    if (pendingSaveRef.current) {
      console.log('Skipping checkbox initialization - save in progress');
      return;
    }

    console.log('Initializing checkbox states from lists:', lists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
    
    // Clear existing states first
    checkboxStatesRef.current.clear();
    
    // Initialize with saved states
    lists.forEach(list => {
      if (list.checkedItems && Object.keys(list.checkedItems).length > 0) {
        checkboxStatesRef.current.set(list.id, { ...list.checkedItems });
      }
    });

    // Store the latest lists for saving
    latestListsRef.current = lists;
  }, []);

  // Apply checkbox states to any list array
  const applyCheckboxStates = useCallback((lists: BlueprintList[]): BlueprintList[] => {
    return lists.map(list => ({
      ...list,
      checkedItems: checkboxStatesRef.current.get(list.id) || {}
    }));
  }, []);

  // Update checkbox state and save
  const updateCheckboxState = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Updating checkbox state for list:', listId, 'checkedItems:', checkedItems);
    
    // Update our central store immediately
    checkboxStatesRef.current.set(listId, { ...checkedItems });
    
    // Mark that we have a pending save to block re-initialization
    pendingSaveRef.current = true;
    setIsUpdating(true);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Starting checkbox save operation');
        
        // Apply current checkbox states to the latest lists
        const listsWithUpdatedCheckboxes = applyCheckboxStates(latestListsRef.current);
        
        console.log('Saving lists with checkbox states:', listsWithUpdatedCheckboxes.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
        
        // Save to database
        await saveBlueprint(rundownTitle, listsWithUpdatedCheckboxes, showDate, true);
        
        console.log('Checkbox changes saved successfully');
      } catch (error) {
        console.error('Failed to save checkbox changes:', error);
      } finally {
        // Clear pending state
        pendingSaveRef.current = false;
        setIsUpdating(false);
        saveTimeoutRef.current = null;
      }
    }, 300); // Reduced debounce time for faster saves
  }, [rundownTitle, showDate, saveBlueprint, applyCheckboxStates]);

  // Update the latest lists reference (called when lists change)
  const updateLatestLists = useCallback((lists: BlueprintList[]) => {
    latestListsRef.current = lists;
  }, []);

  // Check if we have pending updates
  const hasPendingUpdates = useCallback(() => {
    return pendingSaveRef.current || isUpdating || saveTimeoutRef.current !== null;
  }, [isUpdating]);

  // Wait for pending updates to complete
  const waitForPendingUpdates = useCallback(async () => {
    if (!hasPendingUpdates()) return;
    
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!hasPendingUpdates()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 3000);
    });
  }, [hasPendingUpdates]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    initializeCheckboxStates,
    applyCheckboxStates,
    updateCheckboxState,
    updateLatestLists,
    isUpdating,
    hasPendingUpdates,
    waitForPendingUpdates
  };
};
