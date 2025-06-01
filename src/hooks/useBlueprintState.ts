
import { useState, useCallback, useMemo, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, generateDefaultBlueprint, getAvailableColumns } from '@/utils/blueprintUtils';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[]) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);

  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Initialize lists when items are loaded or changed
  useEffect(() => {
    if (items.length > 0) {
      setLists(generateDefaultBlueprint(rundownId, rundownTitle, items));
    }
  }, [rundownId, rundownTitle, items]);

  const addNewList = useCallback((name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: `${sourceColumn}_${Date.now()}`,
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn)
    };
    setLists(prev => [...prev, newList]);
  }, [items]);

  const deleteList = useCallback((listId: string) => {
    setLists(prev => prev.filter(list => list.id !== listId));
  }, []);

  const refreshList = useCallback((listId: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: generateListFromColumn(items, list.sourceColumn)
        };
      }
      return list;
    }));
  }, [items]);

  const refreshAllLists = useCallback(() => {
    setLists(prev => prev.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    })));
  }, [items]);

  return {
    lists,
    availableColumns,
    addNewList,
    deleteList,
    refreshList,
    refreshAllLists
  };
};
