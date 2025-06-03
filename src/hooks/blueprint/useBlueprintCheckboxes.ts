
import { useCallback, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintCheckboxes = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  rundownTitle: string,
  showDate: string,
  saveBlueprint: (title: string, updatedLists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>,
  isUpdatingCheckboxes: React.MutableRefObject<boolean>
) => {
  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    isUpdatingCheckboxes.current = true;
    
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, checkedItems };
      }
      return list;
    });
    
    console.log('Updated lists:', updatedLists);
    setLists(updatedLists);
    
    try {
      await saveBlueprint(rundownTitle, updatedLists, showDate, true);
      console.log('Checkbox changes saved successfully');
    } catch (error) {
      console.error('Failed to save checkbox changes:', error);
    } finally {
      setTimeout(() => {
        isUpdatingCheckboxes.current = false;
      }, 1000);
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, isUpdatingCheckboxes]);

  return {
    updateCheckedItems
  };
};
