
import { useState, useCallback, useMemo, useEffect } from 'react';
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
  const { toast } = useToast();
  
  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Wrapper function to include show date in saves
  const saveWithDate = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    saveBlueprint(title, updatedLists, showDate, silent);
  }, [saveBlueprint, showDate]);

  // Drag and drop functionality
  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, saveWithDate, rundownTitle);

  // Initialize lists when items and saved blueprint are loaded
  useEffect(() => {
    if (items.length > 0 && !loading && !initialized) {
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        // Load saved lists and refresh their content based on current items
        const refreshedLists = savedBlueprint.lists.map(list => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn),
          checkedItems: list.checkedItems || {}
        }));
        setLists(refreshedLists);
        
        // Load saved show date if available
        if (savedBlueprint.show_date) {
          setShowDate(savedBlueprint.show_date);
        }
      } else {
        // Generate default blueprint if no saved blueprint exists
        setLists(generateDefaultBlueprint(rundownId, rundownTitle, items));
      }
      setInitialized(true);
    }
  }, [rundownId, rundownTitle, items, savedBlueprint, loading, initialized]);

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
    }
  }, [lists, rundownTitle, saveBlueprint, showDate]);

  const refreshAllLists = useCallback(() => {
    const updatedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
    setLists(updatedLists);
    
    // Save to database silently and show custom refresh message
    saveWithDate(rundownTitle, updatedLists, true);
    
    toast({
      title: 'Success',
      description: 'All lists refreshed successfully!',
    });
  }, [items, lists, rundownTitle, saveWithDate, toast]);

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
