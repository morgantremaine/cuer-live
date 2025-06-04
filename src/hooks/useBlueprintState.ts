
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintState as useBlueprintStateCore } from './blueprint/useBlueprintState';
import { useBlueprintDragAndDrop } from './useBlueprintDragAndDrop';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Use the consolidated blueprint state
  const {
    lists,
    showDate,
    initialized,
    loading,
    updateCheckedItems,
    addNewList,
    deleteList,
    renameList,
    refreshAllLists,
    updateShowDate: updateShowDateCore
  } = useBlueprintStateCore(rundownId, rundownTitle, items);

  // Simple wrapper function for title compatibility
  const saveListsForDragAndDrop = (title: string, updatedLists: any[], silent = false) => {
    // This is handled internally by the new state management
    console.log('Blueprint: Drag and drop save requested');
  };

  // Drag and drop functionality
  const dragAndDropHandlers = useBlueprintDragAndDrop(lists, () => {}, saveListsForDragAndDrop, rundownTitle);

  return {
    lists,
    availableColumns,
    showDate,
    initialized,
    loading,
    updateShowDate: updateShowDateCore,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    ...dragAndDropHandlers
  };
};
