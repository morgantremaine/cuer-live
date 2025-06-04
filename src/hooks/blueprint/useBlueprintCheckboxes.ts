
import { useCallback, useRef, useState } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintCheckboxes = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  rundownTitle: string,
  showDate: string,
  saveBlueprint: (title: string, updatedLists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>
) => {
  const [isUpdatingCheckboxes, setIsUpdatingCheckboxes] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSavesRef = useRef<Map<string, Record<string, boolean>>>(new Map());

  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Checkbox update requested for list:', listId, 'checkedItems:', checkedItems);
    
    setIsUpdatingCheckboxes(true);
    
    // Store pending save
    pendingSavesRef.current.set(listId, checkedItems);
    
    // Update local state immediately
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, checkedItems };
      }
      return list;
    });
    
    setLists(updatedLists);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Saving checkbox changes after debounce');
        
        // Get the most recent state and apply all pending saves
        let finalLists = [...lists];
        
        pendingSavesRef.current.forEach((checkedItems, listId) => {
          finalLists = finalLists.map(list => {
            if (list.id === listId) {
              return { ...list, checkedItems };
            }
            return list;
          });
        });
        
        await saveBlueprint(rundownTitle, finalLists, showDate, true);
        console.log('Checkbox changes saved successfully');
        
        // Clear pending saves
        pendingSavesRef.current.clear();
      } catch (error) {
        console.error('Failed to save checkbox changes:', error);
      } finally {
        setIsUpdatingCheckboxes(false);
      }
    }, 500); // 500ms debounce
    
  }, [lists, rundownTitle, showDate, saveBlueprint, setLists]);

  // Function to check if we have pending checkbox updates
  const hasPendingCheckboxUpdates = useCallback(() => {
    return isUpdatingCheckboxes || pendingSavesRef.current.size > 0;
  }, [isUpdatingCheckboxes]);

  // Function to wait for pending updates to complete
  const waitForPendingUpdates = useCallback(async () => {
    if (!hasPendingCheckboxUpdates()) return;
    
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!hasPendingCheckboxUpdates()) {
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
  }, [hasPendingCheckboxUpdates]);

  return {
    updateCheckedItems,
    isUpdatingCheckboxes,
    hasPendingCheckboxUpdates,
    waitForPendingUpdates
  };
};
