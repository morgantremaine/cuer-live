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
  saveBlueprint: (title: string, lists: BlueprintList[], showDate: string, silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => Promise<any>,
  loadBlueprint: () => Promise<any>,
  operationInProgressRef: React.MutableRefObject<boolean>
) => {
  // Generate consistent list ID based on rundown ID and source column
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Checkbox update handler with better error handling
  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint operations: Updating checked items for list:', listId);
    
    // Update local state immediately
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with debouncing (silent=true means no toast notification)
      saveLists(updatedLists, true).catch(error => {
        console.error('Blueprint operations: Failed to save checked items:', error);
      });
      
      return updatedLists;
    });
  }, [saveLists, setLists]);

  const addNewList = useCallback(async (name: string, sourceColumn: string) => {
    if (operationInProgressRef.current) {
      console.log('Blueprint operations: Add list operation already in progress');
      return;
    }
    
    console.log('Blueprint operations: Adding new list:', name, sourceColumn);
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
      
      // Update state first
      setLists(updatedLists);
      
      // Save immediately without debouncing
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
      console.log('Blueprint operations: New list saved successfully');
      
    } catch (error) {
      console.error('Blueprint operations: Failed to save new list:', error);
      // Revert on error
      setLists(prevLists => prevLists.filter(list => list.name !== name));
    } finally {
      operationInProgressRef.current = false;
    }
  }, [items, lists, rundownTitle, saveBlueprint, generateListId, showDate, setLists, operationInProgressRef]);

  const deleteList = useCallback(async (listId: string) => {
    if (operationInProgressRef.current) {
      console.log('Blueprint operations: Delete operation already in progress');
      return;
    }
    
    console.log('Blueprint operations: Deleting list:', listId);
    operationInProgressRef.current = true;
    
    try {
      const updatedLists = lists.filter(list => list.id !== listId);
      setLists(updatedLists);
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
      console.log('Blueprint operations: List deleted successfully');
    } catch (error) {
      console.error('Blueprint operations: Failed to delete list:', error);
      // Revert on error
      setLists(lists);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const renameList = useCallback(async (listId: string, newName: string) => {
    if (operationInProgressRef.current) {
      console.log('Blueprint operations: Rename operation already in progress');
      return;
    }
    
    console.log('Blueprint operations: Renaming list:', listId, 'to:', newName);
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
      console.log('Blueprint operations: List renamed successfully');
    } catch (error) {
      console.error('Blueprint operations: Failed to rename list:', error);
      // Revert on error
      setLists(lists);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const refreshAllLists = useCallback(async () => {
    if (operationInProgressRef.current) {
      console.log('Blueprint operations: Refresh operation already in progress');
      return;
    }
    
    console.log('Blueprint operations: Refreshing all lists');
    operationInProgressRef.current = true;
    
    try {
      const refreshedLists = lists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
        // Keep existing checkbox states
      }));
      setLists(refreshedLists);
      await saveBlueprint(rundownTitle, refreshedLists, showDate, true);
      console.log('Blueprint operations: Lists refreshed successfully');
    } catch (error) {
      console.error('Blueprint operations: Failed to refresh lists:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [items, lists, rundownTitle, saveBlueprint, showDate, setLists, operationInProgressRef]);

  const updateShowDate = useCallback(async (newDate: string) => {
    if (operationInProgressRef.current) {
      console.log('Blueprint operations: Update date operation already in progress');
      return;
    }
    
    console.log('Blueprint operations: Updating show date to:', newDate);
    operationInProgressRef.current = true;
    
    try {
      await saveBlueprint(rundownTitle, lists, newDate, true);
      console.log('Blueprint operations: Show date updated successfully');
    } catch (error) {
      console.error('Blueprint operations: Failed to update show date:', error);
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
