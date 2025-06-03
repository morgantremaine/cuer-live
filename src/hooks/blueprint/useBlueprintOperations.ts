
import { useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { useToast } from '@/hooks/use-toast';

export const useBlueprintOperations = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  items: RundownItem[],
  rundownTitle: string,
  saveWithDate: (title: string, updatedLists: BlueprintList[], silent?: boolean) => void,
  saveBlueprint: (title: string, updatedLists: BlueprintList[], showDate: string, silent?: boolean) => Promise<void>
) => {
  const { toast } = useToast();

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
    saveWithDate(rundownTitle, updatedLists);
  }, [items, lists, rundownTitle, saveWithDate]);

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
      items: generateListFromColumn(items, list.sourceColumn),
      checkedItems: list.checkedItems || {}
    }));
    setLists(refreshedLists);
    saveWithDate(rundownTitle, refreshedLists, true);
    
    toast({
      title: 'Success',
      description: 'All lists refreshed successfully!',
    });
  }, [items, lists, rundownTitle, saveWithDate, toast]);

  return {
    addNewList,
    deleteList,
    renameList,
    refreshAllLists
  };
};
