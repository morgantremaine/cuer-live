
import { useState, useCallback, useRef, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintCheckboxManager = (
  rundownId: string,
  rundownTitle: string,
  showDate: string,
  saveBlueprint: (title: string, lists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>
) => {
  // Central store for checkbox states - this is the single source of truth
  const checkboxStatesRef = useRef<Map<string, Record<string, boolean>>>(new Map());
  const [isUpdating, setIsUpdating] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize checkbox states from saved blueprint data
  const initializeCheckboxStates = useCallback((lists: BlueprintList[]) => {
    console.log('Initializing checkbox states from lists:', lists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
    
    lists.forEach(list => {
      if (list.checkedItems && Object.keys(list.checkedItems).length > 0) {
        checkboxStatesRef.current.set(list.id, { ...list.checkedItems });
      }
    });
  }, []);

  // Apply checkbox states to any list array - this ensures states are never lost
  const applyCheckboxStates = useCallback((lists: BlueprintList[]): BlueprintList[] => {
    return lists.map(list => ({
      ...list,
      checkedItems: checkboxStatesRef.current.get(list.id) || {}
    }));
  }, []);

  // Update checkbox state for a specific list
  const updateCheckboxState = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Updating checkbox state for list:', listId, 'checkedItems:', checkedItems);
    
    // Update our central store immediately
    checkboxStatesRef.current.set(listId, { ...checkedItems });
    setIsUpdating(true);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Saving checkbox changes to database');
        
        // We need to get the current lists and apply our checkbox states
        // Since we don't have direct access to lists here, we'll trigger a save
        // through a callback that the parent component provides
        if (onSaveCheckboxStates) {
          await onSaveCheckboxStates();
        }
        
        console.log('Checkbox changes saved successfully');
      } catch (error) {
        console.error('Failed to save checkbox changes:', error);
      } finally {
        setIsUpdating(false);
      }
    }, 500);
  }, []);

  // Callback that parent component will provide to handle saves
  let onSaveCheckboxStates: (() => Promise<void>) | null = null;

  const setOnSaveCheckboxStates = useCallback((callback: () => Promise<void>) => {
    onSaveCheckboxStates = callback;
  }, []);

  // Check if we have pending updates
  const hasPendingUpdates = useCallback(() => {
    return isUpdating || saveTimeoutRef.current !== null;
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
      
      // Timeout after 2 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 2000);
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
    setOnSaveCheckboxStates,
    isUpdating,
    hasPendingUpdates,
    waitForPendingUpdates
  };
};
