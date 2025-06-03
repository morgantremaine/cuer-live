
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, generateDefaultBlueprint, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [lastItemsHash, setLastItemsHash] = useState<string>('');
  // Add a ref to track if we're currently updating checkbox state
  const isUpdatingCheckboxes = useRef(false);
  // Add a ref to track if we've already initialized to prevent multiple initializations
  const hasInitialized = useRef(false);
  const { toast } = useToast();
  
  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Wrapper function to include show date in saves
  const saveWithDate = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    saveBlueprint(title, updatedLists, showDate, silent);
  }, [saveBlueprint, showDate]);

  // Drag and drop functionality
  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, saveWithDate, rundownTitle);

  // Create a hash of items to detect actual changes
  const createItemsHash = useCallback((items: RundownItem[]) => {
    return JSON.stringify(items.map(item => ({ id: item.id, name: item.name, segmentName: item.segmentName })));
  }, []);

  // Initialize lists when items and saved blueprint are loaded
  useEffect(() => {
    // Don't reinitialize if we're currently updating checkboxes
    if (isUpdatingCheckboxes.current) {
      return;
    }

    // Prevent multiple initializations with ref
    if (items.length > 0 && !loading && !hasInitialized.current) {
      console.log('Initializing blueprint state with items:', items.length);
      
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        console.log('Loading saved blueprint with', savedBlueprint.lists.length, 'lists');
        // Load saved lists and refresh their content based on current items
        const refreshedLists = savedBlueprint.lists.map(list => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
          // CRITICAL: Preserve the saved checkedItems state
          checkedItems: list.checkedItems || {}
        }));
        setLists(refreshedLists);
        console.log('Loaded lists with preserved checkbox states:', refreshedLists.map(l => ({ id: l.id, checkedItems: l.checkedItems })));
        
        // Load saved show date if available
        if (savedBlueprint.show_date) {
          setShowDate(savedBlueprint.show_date);
        }
      } else {
        // Generate default blueprint if no saved blueprint exists
        console.log('Generating default blueprint');
        setLists(generateDefaultBlueprint(rundownId, rundownTitle, items));
      }
      
      // Set the initial items hash
      setLastItemsHash(createItemsHash(items));
      setInitialized(true);
      hasInitialized.current = true;
    }
  }, [rundownId, rundownTitle, items, savedBlueprint, loading, createItemsHash]);

  // Refresh list content when items actually change (but preserve checkbox states)
  useEffect(() => {
    // Don't refresh if we're currently updating checkboxes
    if (isUpdatingCheckboxes.current) {
      return;
    }

    if (initialized && items.length > 0 && lists.length > 0) {
      const currentItemsHash = createItemsHash(items);
      
      // Only refresh if items actually changed
      if (currentItemsHash !== lastItemsHash) {
        console.log('Items changed, refreshing lists while preserving checkbox states');
        
        const refreshedLists = lists.map(list => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
          // CRITICAL: Preserve existing checkbox states during refresh
          checkedItems: list.checkedItems || {}
        }));
        
        setLists(refreshedLists);
        setLastItemsHash(currentItemsHash);
        
        // Save silently to preserve checkbox states
        saveBlueprint(rundownTitle, refreshedLists, showDate, true);
      }
    }
  }, [items, initialized, lists, rundownTitle, showDate, saveBlueprint, lastItemsHash, createItemsHash]);

  const addNewList = useCallback((name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    
    // Save to database
    saveWithDate(rundownTitle, updatedLists);
  }, [items, lists, rundownTitle, saveWithDate]);

  const deleteList = useCallback((listId: string) => {
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    
    // Save to database
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate]);

  const renameList = useCallback((listId: string, newName: string) => {
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          name: newName
        };
      }
      return list;
    });
    setLists(updatedLists);
    
    // Save to database
    saveWithDate(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveWithDate]);

  const updateCheckedItems = useCallback(async (listId: string, checkedItems: Record<string, boolean>) => {
    console.log('Updating checked items for list:', listId, 'checkedItems:', checkedItems);
    
    // Set the flag to prevent reinitialization during checkbox updates
    isUpdatingCheckboxes.current = true;
    
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          checkedItems
        };
      }
      return list;
    });
    
    console.log('Updated lists:', updatedLists);
    setLists(updatedLists);
    
    // Force immediate save to database for checkbox changes
    try {
      await saveBlueprint(rundownTitle, updatedLists, showDate, true);
      console.log('Checkbox changes saved successfully');
    } catch (error) {
      console.error('Failed to save checkbox changes:', error);
    } finally {
      // Clear the flag after a delay to allow the save to complete
      setTimeout(() => {
        isUpdatingCheckboxes.current = false;
      }, 1000); // Increased timeout to ensure save completes
    }
  }, [lists, rundownTitle, saveBlueprint, showDate]);

  const refreshAllLists = useCallback(() => {
    const refreshedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn),
      // CRITICAL: Preserve checkbox states during manual refresh
      checkedItems: list.checkedItems || {}
    }));
    setLists(refreshedLists);
    
    // Update the items hash to prevent automatic refresh from triggering
    setLastItemsHash(createItemsHash(items));
    
    // Save to database silently and show custom refresh message
    saveWithDate(rundownTitle, refreshedLists, true);
    
    toast({
      title: 'Success',
      description: 'All lists refreshed successfully!',
    });
  }, [items, lists, rundownTitle, saveWithDate, toast, createItemsHash]);

  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    // Save the updated date
    saveBlueprint(rundownTitle, lists, newDate, true);
  }, [rundownTitle, lists, saveBlueprint]);

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
