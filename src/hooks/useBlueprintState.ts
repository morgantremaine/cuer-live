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
  
  // Track initialization state and prevent concurrent operations
  const operationInProgressRef = useRef(false);
  const initStateRef = useRef({
    initialized: false,
    rundownId: ''
  });
  
  const { savedBlueprint, loading, saveBlueprint, loadBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Generate consistent list ID based on rundown ID and source column
  const generateListId = useCallback((sourceColumn: string) => {
    const timestamp = Date.now();
    const random = Math.random();
    return `${sourceColumn}_${timestamp}_${random}`;
  }, []);

  // Initialize blueprint data
  useEffect(() => {
    const shouldInitialize = 
      !loading && 
      items.length > 0 && 
      rundownId && 
      rundownTitle && 
      !operationInProgressRef.current &&
      (!initStateRef.current.initialized || initStateRef.current.rundownId !== rundownId);
    
    if (shouldInitialize) {
      console.log('Initializing blueprint state with items:', items.length);
      operationInProgressRef.current = true;
      
      const initializeLists = async () => {
        // Try to load saved blueprint from database
        const blueprint = await loadBlueprint();
        
        if (blueprint && blueprint.lists && blueprint.lists.length > 0) {
          console.log('Loading saved blueprint with', blueprint.lists.length, 'lists');
          
          // Create lists with fresh items but existing checkbox states
          const refreshedLists = blueprint.lists.map(list => ({
            ...list,
            items: generateListFromColumn(items, list.sourceColumn),
            // Preserve checkbox states from database
            checkedItems: list.checkedItems || {}
          }));
          
          console.log('Loaded lists with checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
          setLists(refreshedLists);
          
          // Set show date from saved blueprint if available
          if (blueprint.show_date) {
            setShowDate(blueprint.show_date);
          }
        } else {
          console.log('Creating default blueprint');
          // No saved blueprint, create default list
          const defaultLists = [
            {
              id: generateListId('headers'),
              name: 'Rundown Overview',
              sourceColumn: 'headers',
              items: generateListFromColumn(items, 'headers'),
              checkedItems: {}
            }
          ];
          setLists(defaultLists);
          
          // Save the default list to database
          await saveBlueprint(rundownTitle, defaultLists, showDate, true);
        }
        
        initStateRef.current = {
          initialized: true,
          rundownId: rundownId
        };
        setInitialized(true);
        operationInProgressRef.current = false;
      };
      
      initializeLists();
    }
  }, [loading, items, rundownId, rundownTitle, savedBlueprint, loadBlueprint, saveBlueprint, generateListId, showDate]);

  // Reset initialization when rundown changes
  useEffect(() => {
    if (initStateRef.current.rundownId !== rundownId) {
      console.log('Rundown changed, resetting initialization');
      initStateRef.current.initialized = false;
      setInitialized(false);
      operationInProgressRef.current = false;
    }
  }, [rundownId]);

  // Save lists to database with a delay
  const saveLists = useCallback(async (updatedLists: BlueprintList[], silent = false) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping save');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      await saveBlueprint(rundownTitle, updatedLists, showDate, silent);
    } catch (error) {
      console.error('Error saving lists:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [rundownTitle, showDate, saveBlueprint]);

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
  }, [saveLists]);

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
  }, [items, lists, rundownTitle, saveBlueprint, loadBlueprint, generateListId, showDate]);

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
  }, [lists, rundownTitle, saveBlueprint, showDate]);

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
  }, [lists, rundownTitle, saveBlueprint, showDate]);

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
  }, [items, lists, rundownTitle, saveBlueprint, showDate]);

  const updateShowDate = useCallback(async (newDate: string) => {
    if (operationInProgressRef.current) {
      console.log('Operation in progress, skipping update show date');
      return;
    }
    
    operationInProgressRef.current = true;
    try {
      setShowDate(newDate);
      await saveBlueprint(rundownTitle, lists, newDate, true);
    } catch (error) {
      console.error('Failed to update show date:', error);
    } finally {
      operationInProgressRef.current = false;
    }
  }, [lists, rundownTitle, saveBlueprint]);

  // Drag and drop functionality
  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, saveLists, rundownTitle);

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
