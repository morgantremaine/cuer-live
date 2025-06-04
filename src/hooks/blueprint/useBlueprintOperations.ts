
import { useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';

export const useBlueprintOperations = (
  items: RundownItem[],
  lists: BlueprintList[],
  setLists: React.Dispatch<React.SetStateAction<BlueprintList[]>>,
  rundownTitle: string,
  showDate: string,
  saveLists: (updatedLists: BlueprintList[], silent?: boolean) => Promise<void>,
  saveBlueprint: (title: string, lists: BlueprintList[], showDate: string, silent?: boolean) => Promise<any>,
  loadBlueprint: () => Promise<any>,
  operationInProgressRef: React.MutableRefObject<boolean>
) => {
  // Generate consistent list ID based on rundown ID and source column
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Checkbox update handler
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint state: updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Update local state immediately
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with debouncing (silent=true means no toast notification)
      saveLists(updatedLists, true);
      
      return updatedLists;
    });
  }, [saveLists, setLists]);

  const addNewList = useCallback(async (name: string, sourceColumn: string) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping add new list');
      return;
    }
    
    console.log('Adding new list:', name, 'for column:', sourceColumn);
    operationInProgressRef.current = true;
    
    try {
      const newList: BlueprintList = {
        id: generateListId(sourceColumn),
        name,
        sourceColumn,
        items: generateListFromColumn(items, sourceColumn),
        checkedItems: {}
      };
      
      const updatedLists = [...lists, newList];
      console.log('Updated lists count:', updatedLists.length);
      
      // Update state first
      setLists(updatedLists);
      
      // Save immediately without debouncing
      console.log('Saving new list to database with', updatedLists.length, 'total lists');
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
      console.log('New list saved successfully');
      
      // Force reload lists after saving to ensure we have the latest data
      await loadBlueprint();
    } catch (error) {
      console.error('Failed to save new list:', error);
      // Revert on error
      setLists(prevLists => [...prevLists]);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [items, lists, rundownTitle, saveBlueprint, loadBlueprint, generateListId, showDate, setLists, operationInProgressRef]);

  const deleteList = useCallback(async (listId: string) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping delete list');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      const updatedLists = lists.filter(list => list.id !== listId);
      setLists(updatedLists);
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
    } catch (error) {
      console.error('Failed to delete list:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const renameList = useCallback(async (listId: string, newName: string) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping rename list');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      const updatedLists = lists.map(list => {
        if (list.id === listId) {
          return { ...list, name: newName };
        }
        return list;
      });
      setLists(updatedLists);
      await saveBlueprint(rundownTitle, updatedLists, showDate, true);
    } catch (error) {
      console.error('Failed to rename list:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const refreshAllLists = useCallback(async () => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping refresh all lists');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      const refreshedLists = lists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
        // Keep existing checkbox states
      }));
      setLists(refreshedLists);
      await saveBlueprint(rundownTitle, refreshedLists, showDate, true);
    } catch (error) {
      console.error('Failed to refresh lists:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [items, lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const updateShowDate = useCallback(async (newDate: string) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping update show date');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      await saveBlueprint(rundownTitle, lists, newDate, true);
    } catch (error) {
      console.error('Failed to update show date:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, operationInProgressRef]);

  return {
    updateCheckedItems,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists,
    updateShowDate
  };
};
