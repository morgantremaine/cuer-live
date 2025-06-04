
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

  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    // Prevent checkbox updates during initialization
    if (!initializationCompleted) {
      console.log('Ignoring checkbox update - initialization not completed');
      return;
    }

    // Prevent concurrent saves
    if (savingRef.current) {
      console.log('Ignoring checkbox update - save in progress');
      return;
    }

    console.log('Updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
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
      
      // Save immediately
      await saveBlueprint(rundownTitle, updatedLists, showDate, true);
      console.log('Checkbox changes saved successfully');
    } catch (error) {
      console.error('Failed to save checkbox changes:', error);
    } finally {
      savingRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, initializationCompleted]);

  return {
    updateCheckedItems
  };
};
