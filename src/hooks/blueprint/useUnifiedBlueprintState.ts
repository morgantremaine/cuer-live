
import { useMemo, useEffect } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';
import { generateListFromColumn, getAvailableColumns, generateDefaultBlueprint } from '@/utils/blueprintUtils';
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

  // Available columns for creating new lists - dynamically generated from rundown data
  const availableColumns = useMemo(() => {
    return getAvailableColumns(items);
  }, [items]);

  // Auto-create default lists if none exist and we have rundown items
  useEffect(() => {
    if (state.isInitialized && 
        state.lists.length === 0 && 
        items.length > 0 && 
        availableColumns.length > 0) {
      console.log('📋 No lists found, creating default blueprint');
      
      // Extract rundownId from the context or generate one
      const rundownId = items[0]?.id?.split('-')[0] || 'default';
      const rundownTitle = 'Rundown Blueprint';
      
      const defaultLists = generateDefaultBlueprint(rundownId, rundownTitle, items);
      if (defaultLists.length > 0) {
        console.log('📋 Creating default lists:', defaultLists);
        updateLists(defaultLists);
      }
    }
  }, [state.isInitialized, state.lists.length, items, availableColumns, updateLists]);

  // Generate list ID
  const generateListId = (sourceColumn: string) => {
    return `${sourceColumn}_${Date.now()}`;
  };

  // Add new list with items from column
  const addNewList = (name: string, sourceColumn: string) => {
    console.log('📋 Adding new list:', name, 'from column:', sourceColumn);
    
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    console.log('📋 Generated new list:', newList);
    addList(newList);
  };

  // Refresh all lists with current rundown data
  const refreshAllLists = () => {
    console.log('📋 Refreshing all lists with current rundown data');
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
