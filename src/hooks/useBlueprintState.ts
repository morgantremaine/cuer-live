
import { useState, useCallback, useMemo, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';
import { useBlueprintCheckboxManager } from './blueprint/useBlueprintCheckboxManager';
import { format } from 'date-fns';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const [lists, setListsInternal] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  
  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Initialize the checkbox manager
  const {
    initializeCheckboxStates,
    applyCheckboxStates,
    updateCheckboxState,
    updateLatestLists,
    isUpdating,
    hasPendingUpdates,
    waitForPendingUpdates
  } = useBlueprintCheckboxManager(rundownId, rundownTitle, showDate, saveBlueprint);

  // Safe setLists function that always preserves checkbox states
  const setLists = useCallback((newLists: BlueprintList[]) => {
    console.log('Setting lists with checkbox state preservation');
    const listsWithCheckboxes = applyCheckboxStates(newLists);
    setListsInternal(listsWithCheckboxes);
    // Update the latest lists reference in the checkbox manager
    updateLatestLists(listsWithCheckboxes);
  }, [applyCheckboxStates, updateLatestLists]);

  // Checkbox update handler - this is the main interface for checkbox changes
  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint state: updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Update local state immediately for UI responsiveness
    setListsInternal(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      // Update the checkbox manager's latest lists reference
      updateLatestLists(updatedLists);
      return updatedLists;
    });
    
    // Update the checkbox manager state and trigger save
    await updateCheckboxState(listId, checkedItems);
  }, [updateCheckboxState, updateLatestLists]);

  // Initialize blueprint data - this runs once when the component loads
  useEffect(() => {
    if (!loading && items.length > 0 && !initialized) {
      console.log('Initializing blueprint state with items:', items.length);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        
        // Create lists with fresh items
        const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn)
        }));
        
        // Initialize checkbox states first
        initializeCheckboxStates(refreshedLists);
        
        // Apply checkbox states and set lists
        setLists(refreshedLists);
        
        if (savedBlueprint.show_date) {
          setShowDate(savedBlueprint.show_date);
        }
      } else {
        console.log('Creating default blueprint');
        const defaultLists = [
          {
            id: `headers_${Date.now()}_${Math.random()}`,
            name: 'Rundown Overview',
            sourceColumn: 'headers',
            items: generateListFromColumn(items, 'headers'),
            checkedItems: {}
          }
        ];
        setLists(defaultLists);
      }
      
      setInitialized(true);
    }
  }, [loading, items, initialized, savedBlueprint, setLists, initializeCheckboxStates]);

  const saveWithDate = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    return saveBlueprint(title, updatedLists, showDate, silent);
  }, [saveBlueprint, showDate]);

  const addNewList = useCallback((name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: `${sourceColumn}_${Date.now()}_${Math.random()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    saveWithDate(rundownTitle, updatedLists);
  }, [items, lists, rundownTitle, saveWithDate, setLists]);

  const deleteList = useCallback((listId: string) => {
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate, setLists]);

  const renameList = useCallback((listId: string, newName: string) => {
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, name: newName };
      }
      return list;
    });
    setLists(updatedLists);
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate, setLists]);

  const refreshAllLists = useCallback(async () => {
    // Wait for any pending checkbox updates
    await waitForPendingUpdates();
    
    const refreshedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
    setLists(refreshedLists);
    saveWithDate(rundownTitle, refreshedLists, true);
  }, [items, lists, rundownTitle, saveWithDate, setLists, waitForPendingUpdates]);

  const updateShowDate = useCallback(async (newDate: string) => {
    await waitForPendingUpdates();
    setShowDate(newDate);
    saveBlueprint(rundownTitle, lists, newDate, true);
  }, [rundownTitle, lists, saveBlueprint, waitForPendingUpdates]);

  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, saveWithDate, rundownTitle);

  return {
    lists,
    availableColumns,
    showDate,
    updateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    ...dragAndDropHandlers
  };
};
