
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn, getAvailableColumns } from '@/utils/blueprintUtils';
import { useBlueprintDataManager } from '@/hooks/blueprint/useBlueprintDataManager';
import { useBlueprintDragDrop } from '@/hooks/blueprint/useBlueprintDragDrop';

export const useNewBlueprintState = (
  rundownId: string, 
  rundownTitle: string, 
  items: RundownItem[]
) => {
  console.log('🔵 useNewBlueprintState called for rundown:', rundownId);
  
  // Core data manager
  const manager = useBlueprintDataManager(rundownId, rundownTitle);
  
  // Available columns from rundown items
  const availableColumns = useMemo(() => {
    const columns = getAvailableColumns(items);
    console.log('📊 Available columns:', columns.map(c => c.name));
    return columns;
  }, [items]);

  // Enhanced list operations that refresh from rundown data
  const addNewList = (name: string, sourceColumn: string) => {
    console.log('➕ Adding new list:', name, 'from column:', sourceColumn);
    const listItems = generateListFromColumn(items, sourceColumn);
    console.log('📝 Generated', listItems.length, 'items for new list');
    manager.addList(name, sourceColumn, listItems);
  };

  // Manual refresh function (not automatic)
  const refreshAllLists = () => {
    console.log('🔄 Refreshing all lists from rundown data');
    const updatedLists = manager.data.lists.map(list => {
      const refreshedItems = generateListFromColumn(items, list.sourceColumn);
      console.log('🔄 Refreshed list', list.name, ':', refreshedItems.length, 'items');
      return {
        ...list,
        items: refreshedItems
      };
    });
    manager.updateLists(updatedLists);
  };

  // Drag and drop functionality
  const {
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder
  } = useBlueprintDragDrop(
    manager.data.lists,
    manager.updateLists,
    () => manager.save(true), // Use manager's save function
    manager.data.componentOrder
  );

  // Update component order when it changes
  const handleComponentOrderChange = (newOrder: string[]) => {
    console.log('🔄 Component order change:', newOrder);
    updateComponentOrder(newOrder);
    manager.updateComponentOrder(newOrder);
  };

  console.log('📊 Blueprint state summary:', {
    isLoading: manager.isLoading,
    isInitialized: manager.isInitialized,
    listsCount: manager.data.lists.length,
    crewMembersCount: manager.data.crewData.length,
    notesLength: manager.data.notes.length
  });

  return {
    // Core state
    lists: manager.data.lists,
    notes: manager.data.notes,
    crewData: manager.data.crewData,
    cameraPlots: manager.data.cameraPlots,
    showDate: manager.data.showDate,
    componentOrder: manager.data.componentOrder,
    
    // Status
    isLoading: manager.isLoading,
    isInitialized: manager.isInitialized,
    isSaving: manager.isSaving,
    
    // Available data
    availableColumns,
    
    // List operations
    addNewList,
    deleteList: manager.deleteList,
    renameList: manager.renameList,
    updateCheckedItems: manager.updateListCheckedItems,
    refreshAllLists,
    
    // Other operations
    updateShowDate: manager.updateShowDate,
    updateNotes: manager.updateNotes,
    updateCrewData: manager.updateCrewData,
    updateCameraPlots: manager.updateCameraPlots,
    
    // Drag and drop
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder: handleComponentOrderChange
  };
};
