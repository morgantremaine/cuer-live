
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintStorage } from './useBlueprintStorage';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';
import { useBlueprintInitialization } from './blueprint/useBlueprintInitialization';
import { useBlueprintSaving } from './blueprint/useBlueprintSaving';
import { useBlueprintOperations } from './blueprint/useBlueprintOperations';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const { savedBlueprint, loading, saveBlueprint, loadBlueprint } = useBlueprintStorage(rundownId);
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Initialize blueprint data
  const {
    lists,
    setLists,
    showDate,
    setShowDate,
    initialized,
    operationInProgressRef
  } = useBlueprintInitialization(
    rundownId,
    rundownTitle,
    items,
    savedBlueprint,
    loading,
    loadBlueprint,
    saveBlueprint
  );

  // Blueprint saving functionality
  const { saveLists, saveListsForDragAndDrop } = useBlueprintSaving(
    rundownId,
    rundownTitle,
    showDate
  );

  // Blueprint operations
  const {
    updateCheckedItems,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists,
    updateShowDate
  } = useBlueprintOperations(
    items,
    lists,
    setLists,
    rundownTitle,
    showDate,
    saveLists,
    saveBlueprint,
    loadBlueprint,
    operationInProgressRef
  );

  // Drag and drop functionality
  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, setLists, saveListsForDragAndDrop, rundownTitle);

  // Update show date wrapper that also updates local state
  const handleUpdateShowDate = (newDate: string) => {
    setShowDate(newDate);
    updateShowDate(newDate);
  };

  return {
    lists,
    availableColumns,
    showDate,
    updateShowDate: handleUpdateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    ...dragAndDropHandlers
  };
};
