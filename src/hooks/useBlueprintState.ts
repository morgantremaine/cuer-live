
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
  
  // Prevent concurrent operations
  const operationLockRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
                             (!initializationRef.current.completed || initializationRef.current.rundownId !== rundownId) &&
                             !operationLockRef.current;

    if (shouldInitialize) {
      operationLockRef.current = true;
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
      operationLockRef.current = false;
    }
  }, [loading, items, initialized, savedBlueprint, rundownId, rundownTitle, generateConsistentListId]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (initializationRef.current.rundownId !== rundownId) {
      console.log('Rundown changed, resetting initialization');
      initializationRef.current.completed = false;
      setInitialized(false);
      operationLockRef.current = false;
      
      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }
  }, [rundownId]);

  // Debounced save function
  const debouncedSave = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    if (operationLockRef.current) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!operationLockRef.current) {
        operationLockRef.current = true;
        try {
          await saveBlueprint(title, updatedLists, showDate, silent);
        } finally {
          operationLockRef.current = false;
        }
      }
    }, silent ? 100 : 500); // Shorter delay for silent saves (checkbox changes)
  }, [saveBlueprint, showDate]);

  // Checkbox update handler with debounced save
  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Blueprint state: updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Update local state immediately
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with debouncing
      console.log('Saving checkbox changes with debouncing');
      debouncedSave(rundownTitle, updatedLists, true);
      
      return updatedLists;
    });
  }, [rundownTitle, debouncedSave]);

  const addNewList = useCallback(async (name: string, sourceColumn: string) => {
    if (operationLockRef.current) {
      console.log('Operation in progress, skipping add new list');
      return;
    }
    
    console.log('Adding new list:', name, 'for column:', sourceColumn);
    operationLockRef.current = true;
    
    try {
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
      
      // Save immediately without debouncing for new lists
      console.log('Saving new list to database with', updatedLists.length, 'total lists');
      await saveBlueprint(rundownTitle, updatedLists, showDate, false);
      console.log('New list saved successfully');
    } catch (error) {
      console.error('Failed to save new list:', error);
      // Revert state on error
      setLists(lists);
    } finally {
      operationLockRef.current = false;
    }
  }, [items, lists, rundownTitle, saveBlueprint, showDate, generateConsistentListId, rundownId]);

  const deleteList = useCallback((listId: string) => {
    if (operationLockRef.current) return;
    
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    debouncedSave(rundownTitle, updatedLists);
  }, [lists, rundownTitle, debouncedSave]);

  const renameList = useCallback((listId: string, newName: string) => {
    if (operationLockRef.current) return;
    
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, name: newName };
      }
      return list;
    });
    setLists(updatedLists);
    debouncedSave(rundownTitle, updatedLists);
  }, [lists, rundownTitle, debouncedSave]);

  const refreshAllLists = useCallback(() => {
    if (operationLockRef.current) return;
    
    const refreshedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
      // IMPORTANT: Keep existing checkbox states during refresh
    }));
    setLists(refreshedLists);
    debouncedSave(rundownTitle, refreshedLists, true);
  }, [items, lists, rundownTitle, debouncedSave]);

  const updateShowDate = useCallback((newDate: string) => {
    if (operationLockRef.current) return;
    
    setShowDate(newDate);
    debouncedSave(rundownTitle, lists, true);
  }, [rundownTitle, lists, debouncedSave]);

  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, debouncedSave, rundownTitle);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
