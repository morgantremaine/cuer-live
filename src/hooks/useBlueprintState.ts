
import { useState, useCallback, useMemo, useEffect } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';
import { useBlueprintInitialization } from './blueprint/useBlueprintInitialization';
import { useBlueprintOperations } from './blueprint/useBlueprintOperations';
import { useBlueprintCheckboxes } from './blueprint/useBlueprintCheckboxes';
import { format } from 'date-fns';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [lastItemsHash, setLastItemsHash] = useState<string>('');
  
  const { savedBlueprint, loading, saveBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  const saveWithDate = useCallback((title: string, updatedLists: BlueprintList[], silent = false) => {
    return saveBlueprint(title, updatedLists, showDate, silent);
  }, [saveBlueprint, showDate]);

  const createItemsHash = useCallback((items: RundownItem[]) => {
    return JSON.stringify(items.map(item => ({ id: item.id, name: item.name, segmentName: item.segmentName })));
  }, []);

  const { updateCheckedItems, isSaving, hasPendingSave } = useBlueprintCheckboxes(
    lists,
    setLists,
    rundownTitle,
    showDate,
    saveBlueprint,
    initialized
  );

  const { initializationCompleted } = useBlueprintInitialization(
    rundownId,
    rundownTitle,
    items,
    savedBlueprint,
    loading,
    setLists,
    setShowDate,
    setInitialized,
    setLastItemsHash,
    createItemsHash,
    hasPendingSave
  );

  const { addNewList, deleteList, renameList, refreshAllLists } = useBlueprintOperations(
    lists,
    setLists,
    items,
    rundownTitle,
    saveWithDate,
    saveBlueprint
  );

  // Refresh list content when items actually change (but preserve checkbox states)
  // Only do this after initialization is complete and no pending saves
  useEffect(() => {
    if (!initializationCompleted || !initialized || items.length === 0 || lists.length === 0 || hasPendingSave) {
      return;
    }

    const currentItemsHash = createItemsHash(items);
    
    if (currentItemsHash !== lastItemsHash) {
      console.log('Items changed, refreshing lists while preserving checkbox states');
      
      const refreshedLists = lists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn),
        // Preserve existing checkbox states
        checkedItems: list.checkedItems || {}
      }));
      
      setLists(refreshedLists);
      setLastItemsHash(currentItemsHash);
      
      // Save silently
      saveBlueprint(rundownTitle, refreshedLists, showDate, true);
    }
  }, [items, initializationCompleted, initialized, lists, rundownTitle, showDate, saveBlueprint, lastItemsHash, createItemsHash, hasPendingSave]);

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
