
import { useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { useAuth } from '@/hooks/useAuth';
import { useBlueprintCore } from '@/hooks/blueprint/useBlueprintCore';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';
import { useBlueprintDragDrop } from '@/hooks/blueprint/useBlueprintDragDrop';
import { useBlueprintInitialization } from '@/hooks/blueprint/useBlueprintInitialization';

export const useBlueprintState = (rundownId: string, rundownTitle: string, items: RundownItem[], rundownStartTime?: string) => {
  const { user } = useAuth();
  
  const {
    lists,
    setLists,
    showDate,
    setShowDate,
    initialized,
    setInitialized,
    loading,
    setLoading,
    savedBlueprint,
    setSavedBlueprint,
    availableColumns,
    stateRef,
    generateListId
  } = useBlueprintCore(items);

  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    showDate,
    savedBlueprint,
    setSavedBlueprint
  );

  const {
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useBlueprintDragDrop(
    lists, 
    setLists, 
    saveBlueprint,
    () => savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'] // Return current component order as function
  );

  useBlueprintInitialization(
    user,
    rundownId,
    rundownTitle,
    items,
    initialized,
    loading,
    stateRef,
    setLists,
    setInitialized,
    setLoading,
    setShowDate,
    async () => {
      const blueprint = await loadBlueprint();
      // Component order is now managed by the unified state, no need to update it here
      return blueprint;
    },
    saveBlueprint, // Pass the full saveBlueprint function with all parameters
    generateListId
  );

  // Update checked items with proper save call
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with the correct parameter order including component order
      setTimeout(() => {
        const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
        saveBlueprint(
          updatedLists, // updatedLists
          true, // silent
          undefined, // showDateOverride (use current)
          undefined, // notes (keep existing)
          undefined, // crewData (keep existing)
          undefined, // cameraPlots (keep existing)
          currentComponentOrder // componentOrder
        );
      }, 500);
      
      return updatedLists;
    });
  }, [saveBlueprint, savedBlueprint]);

  // Add new list
  const addNewList = useCallback((name: string, sourceColumn: string) => {
    const newList: BlueprintList = {
      id: generateListId(sourceColumn),
      name,
      sourceColumn,
      items: generateListFromColumn(items, sourceColumn),
      checkedItems: {}
    };
    
    setLists(currentLists => {
      const updatedLists = [...currentLists, newList];
      const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
      saveBlueprint(updatedLists, false, undefined, undefined, undefined, undefined, currentComponentOrder);
      return updatedLists;
    });
  }, [items, generateListId, saveBlueprint, savedBlueprint]);

  // Delete list
  const deleteList = useCallback((listId: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.filter(list => list.id !== listId);
      const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
      saveBlueprint(updatedLists, false, undefined, undefined, undefined, undefined, currentComponentOrder);
      return updatedLists;
    });
  }, [saveBlueprint, savedBlueprint]);

  // Rename list
  const renameList = useCallback((listId: string, newName: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      );
      const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
      saveBlueprint(updatedLists, true, undefined, undefined, undefined, undefined, currentComponentOrder);
      return updatedLists;
    });
  }, [saveBlueprint, savedBlueprint]);

  // Refresh all lists
  const refreshAllLists = useCallback(() => {
    setLists(currentLists => {
      const refreshedLists = currentLists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
      }));
      const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
      saveBlueprint(refreshedLists, true, undefined, undefined, undefined, undefined, currentComponentOrder);
      return refreshedLists;
    });
  }, [items, saveBlueprint, savedBlueprint]);

  // Update show date
  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    setTimeout(() => {
      const currentComponentOrder = savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'];
      saveBlueprint(lists, true, newDate, undefined, undefined, undefined, currentComponentOrder);
    }, 100);
  }, [lists, saveBlueprint, savedBlueprint]);

  return {
    lists,
    availableColumns,
    showDate,
    initialized,
    loading,
    updateShowDate,
    addNewList,
    deleteList,
    renameList,
    updateCheckedItems,
    refreshAllLists,
    draggedListId,
    insertionIndex,
    componentOrder: savedBlueprint?.component_order || ['crew-list', 'camera-plot', 'scratchpad'],
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    savedBlueprint
  };
};
