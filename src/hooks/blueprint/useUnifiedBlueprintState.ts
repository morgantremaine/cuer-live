
import { useMemo } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { RundownItem } from '@/types/rundown';
import { BlueprintList } from '@/types/blueprint';

export const useUnifiedBlueprintState = (items: RundownItem[], rundownStartTime?: string) => {
  const {
    state,
    updateLists,
    addList,
    deleteList,
    renameList,
    updateCheckedItems,
    updateShowDate,
    updateComponentOrder,
    saveBlueprint,
    refreshBlueprint
  } = useBlueprintContext();

  // Available columns for creating new lists
  const availableColumns = useMemo(() => [
    { key: 'name', label: 'Segment Names' },
    { key: 'talent', label: 'Talent' },
    { key: 'gfx', label: 'Graphics' },
    { key: 'video', label: 'Video' },
    { key: 'notes', label: 'Notes' },
    { key: 'script', label: 'Script' },
    { key: 'headers', label: 'Headers' }
  ], []);

  // Generate list ID
  const generateListId = (sourceColumn: string) => {
    return `${sourceColumn}_${Date.now()}`;
  };

  // Add new list with items from column
  const addNewList = (name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    addList(newList);
  };

  // Refresh all lists with current rundown data
  const refreshAllLists = () => {
    const refreshedLists = state.lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
    updateLists(refreshedLists);
  };

  // Drag and drop state - simplified for now
  const draggedListId = null;
  const insertionIndex = null;

  // Simplified drag handlers - to be implemented if needed
  const handleDragStart = () => {};
  const handleDragOver = () => {};
  const handleDragEnterContainer = () => {};
  const handleDragLeave = () => {};
  const handleDrop = () => {};
  const handleDragEnd = () => {};

  return {
    // State
    lists: state.lists,
    availableColumns,
    showDate: state.showDate,
    initialized: state.isInitialized,
    loading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    componentOrder: state.componentOrder,
    
    // Actions
    updateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    saveBlueprint,
    refreshBlueprint,
    
    // Drag and drop (simplified)
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder
  };
};
