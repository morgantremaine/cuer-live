
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';
import { format } from 'date-fns';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  
  // Track initialization to prevent multiple runs
  const initializationRef = useRef<{
    completed: boolean;
    rundownId: string;
  }>({ completed: false, rundownId: '' });

  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Generate consistent list ID based on rundown ID and source column
  const generateConsistentListId = useCallback((sourceColumn: string, rundownId: string, existingLists?: BlueprintList[]) => {
    const baseId = `${sourceColumn}_${rundownId}`;
    
    // If no existing lists provided, return base ID
    if (!existingLists) {
      return baseId;
    }
    
    // Check if base ID already exists
    const existingIds = existingLists.map(list => list.id);
    if (!existingIds.includes(baseId)) {
      return baseId;
    }
    
    // If it exists, add a counter
    let counter = 1;
    let newId = `${baseId}_${counter}`;
    while (existingIds.includes(newId)) {
      counter++;
      newId = `${baseId}_${counter}`;
    }
    return newId;
  }, []);

  // Initialize blueprint data - run only once per rundown
  useEffect(() => {
    const shouldInitialize = !loading && 
                             items.length > 0 && 
                             rundownId &&
                             rundownTitle &&
                             (!initializationRef.current.completed || initializationRef.current.rundownId !== rundownId);

    if (shouldInitialize) {
      console.log('Initializing blueprint state with items:', items.length);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        
        // Create lists with fresh items and EXACT checkbox states from database
        const refreshedLists = savedBlueprint.lists.map((list: BlueprintList) => {
          // Keep the original ID from the saved blueprint to maintain consistency
          return {
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            // CRITICAL: Use the exact checkbox states from the saved blueprint
            checkedItems: list.checkedItems || {}
          };
        });
        
        console.log('Loaded lists with checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
        setLists(refreshedLists);
        
        if (savedBlueprint.show_date) {
          setShowDate(savedBlueprint.show_date);
        }
      } else {
        console.log('Creating default blueprint');
        const defaultLists = [
          {
            id: generateConsistentListId('headers', rundownId),
            name: 'Rundown Overview',
            sourceColumn: 'headers',
            items: generateListFromColumn(items, 'headers'),
            checkedItems: {}
          }
        ];
        setLists(defaultLists);
      }
      
      // Mark initialization as completed for this rundown
      initializationRef.current = {
        completed: true,
        rundownId: rundownId
      };
      setInitialized(true);
    }
  }, [loading, items, initialized, savedBlueprint, rundownId, rundownTitle, generateConsistentListId]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (initializationRef.current.rundownId !== rundownId) {
      console.log('Rundown changed, resetting initialization');
      initializationRef.current.completed = false;
      setInitialized(false);
    }
  }, [rundownId]);

  const saveWithDate = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    return saveBlueprint(title, updatedLists, showDate, silent);
  }, [saveBlueprint, showDate]);

  // Checkbox update handler with immediate database save
  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint state: updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Update local state immediately
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save to database immediately (no debouncing)
      console.log('Saving checkbox changes immediately to database');
      saveBlueprint(rundownTitle, updatedLists, showDate, true);
      
      return updatedLists;
    });
  }, [rundownTitle, showDate, saveBlueprint]);

  const addNewList = useCallback(async (name: string, sourceColumn: string) => {
    console.log('Adding new list:', name, 'for column:', sourceColumn);
    
    const newList: BlueprintList = {
      id: generateConsistentListId(sourceColumn, rundownId, lists),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    const updatedLists = [...lists, newList];
    console.log('Updated lists count:', updatedLists.length);
    
    // Update state first
    setLists(updatedLists);
    
    // Save immediately and wait for completion - use await to ensure it completes
    try {
      console.log('Saving new list to database with', updatedLists.length, 'total lists');
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
      console.log('New list saved successfully');
    } catch (error) {
      console.error('Failed to save new list:', error);
      // Revert state on error
      setLists(lists);
    }
  }, [items, lists, rundownTitle, saveBlueprint, showDate, generateConsistentListId, rundownId]);

  const deleteList = useCallback((listId: string) => {
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate]);

  const renameList = useCallback((listId: string, newName: string) => {
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, name: newName };
      }
      return list;
    });
    setLists(updatedLists);
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate]);

  const refreshAllLists = useCallback(() => {
    const refreshedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
      // IMPORTANT: Keep existing checkbox states during refresh
    }));
    setLists(refreshedLists);
    saveWithDate(rundownTitle, refreshedLists, true);
  }, [items, lists, rundownTitle, saveWithDate]);

  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    saveBlueprint(rundownTitle, lists, newDate, true);
  }, [rundownTitle, lists, saveBlueprint]);

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
