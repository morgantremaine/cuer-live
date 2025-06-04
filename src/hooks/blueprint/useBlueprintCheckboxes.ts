
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
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Set the flag to prevent re-initialization
    isUpdatingCheckboxes.current = true;
    
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, checkedItems };
      }
      return list;
    });
    
    console.log('Updated lists:', updatedLists);
    setLists(updatedLists);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Immediate save for checkbox changes to prevent state loss
    try {
      await saveBlueprint(rundownTitle, updatedLists, showDate, true);
      console.log('Checkbox changes saved successfully');
    } catch (error) {
      console.error('Failed to save checkbox changes:', error);
    } finally {
      // Reset the flag after a shorter delay since we're doing immediate saves
      setTimeout(() => {
        isUpdatingCheckboxes.current = false;
        console.log('Checkbox update flag reset');
      }, 500);
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, isUpdatingCheckboxes]);

  return {
    updateCheckedItems
  };
};
