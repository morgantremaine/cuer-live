
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
  // Core data manager
  const manager = useBlueprintDataManager(rundownId, rundownTitle);
  
  // Available columns from rundown items
  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  // Enhanced list operations that refresh from rundown data
  const addNewList = (name: string, sourceColumn: string) => {
    const listItems = generateListFromColumn(items, sourceColumn);
    manager.addList(name, sourceColumn, listItems);
  };

  const refreshAllLists = () => {
    const updatedLists = manager.data.lists.map(list => ({
      ...list,
      items: generateListFromColumn(items, list.sourceColumn)
    }));
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
    updateComponentOrder(newOrder);
    manager.updateComponentOrder(newOrder);
  };

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
