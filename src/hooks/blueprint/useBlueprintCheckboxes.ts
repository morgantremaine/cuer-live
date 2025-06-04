
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintCheckboxes = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  rundownTitle: string,
  showDate: string,
  saveBlueprint: (title: string, updatedLists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>,
  initializationCompleted: boolean
) => {
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<Promise<void> | null>(null);

  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    // Always allow checkbox updates regardless of initialization state
    console.log('Updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Prevent concurrent saves by waiting for pending save to complete
    if (pendingSaveRef.current) {
      console.log('Waiting for pending save to complete...');
      await pendingSaveRef.current;
    }

    savingRef.current = true;
    
    try {
      const updatedLists = lists.map(list => {
        if (list.id === listId) {
          return { ...list, checkedItems };
        }
        return list;
      });
      
      console.log('Updated lists:', updatedLists);
      setLists(updatedLists);
      
      // Make save synchronous and store the promise
      const savePromise = saveBlueprint(rundownTitle, updatedLists, showDate, true);
      pendingSaveRef.current = savePromise;
      
      await savePromise;
      console.log('Checkbox changes saved successfully');
      
      pendingSaveRef.current = null;
    } catch (error) {
      console.error('Failed to save checkbox changes:', error);
      pendingSaveRef.current = null;
    } finally {
      savingRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate]);

  return {
    updateCheckedItems,
    isSaving: savingRef.current,
    hasPendingSave: pendingSaveRef.current !== null
  };
};
