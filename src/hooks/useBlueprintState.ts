
import { useState, useCallback, useMemo, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, generateDefaultBlueprint, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[]) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Initialize lists when items and saved blueprint are loaded
  useEffect(() => {
    if (items.length > 0 && !loading && !initialized) {
      if (savedBlueprint && savedBlueprint.lists.length > 0) {
        // Load saved lists and refresh their content based on current items
        const refreshedLists = savedBlueprint.lists.map(list => ({
          ...list,
          items: generateListFromColumn(items, list.sourceColumn)
        }));
        setLists(refreshedLists);
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
      items: generateListFromColumn(items, sourceColumn)
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    
    // Save to database
    saveBlueprint(rundownTitle, updatedLists);
  }, [items, lists, rundownTitle, saveBlueprint]);

  const deleteList = useCallback((listId: string) => {
    const updatedLists = lists.filter(list => list.id !== listId);
    setLists(updatedLists);
    
    // Save to database
    saveBlueprint(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveBlueprint]);

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
    saveBlueprint(rundownTitle, updatedLists);
  }, [lists, rundownTitle, saveBlueprint]);

  const refreshAllLists = useCallback(() => {
    const updatedLists = lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
    setLists(updatedLists);
    
    // Save to database
    saveBlueprint(rundownTitle, updatedLists);
  }, [items, lists, rundownTitle, saveBlueprint]);

  return {
    lists,
    availableColumns,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists
  };
};
