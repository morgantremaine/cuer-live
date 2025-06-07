
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
    componentOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useBlueprintDragDrop(lists, setLists, saveBlueprint);

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
    loadBlueprint,
    saveBlueprint,
    generateListId
  );

  // Update checked items with proper save call
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with the correct parameter order
      setTimeout(() => {
        saveBlueprint(
          updatedLists, // updatedLists
          true, // silent
          undefined, // showDateOverride (use current)
          undefined, // notes (keep existing)
          undefined, // crewData (keep existing)
          undefined  // cameraPlots (keep existing)
        );
      }, 500);
      
      return updatedLists;
    });
  }, [saveBlueprint]);

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
      saveBlueprint(updatedLists, false);
      return updatedLists;
    });
  }, [items, generateListId, saveBlueprint]);

  // Delete list
  const deleteList = useCallback((listId: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.filter(list => list.id !== listId);
      saveBlueprint(updatedLists, false);
      return updatedLists;
    });
  }, [saveBlueprint]);

  // Rename list
  const renameList = useCallback((listId: string, newName: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      );
      saveBlueprint(updatedLists, true);
      return updatedLists;
    });
  }, [saveBlueprint]);

  // Refresh all lists
  const refreshAllLists = useCallback(() => {
    setLists(currentLists => {
      const refreshedLists = currentLists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
      }));
      saveBlueprint(refreshedLists, true);
      return refreshedLists;
    });
  }, [items, saveBlueprint]);

  // Update show date
  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    setTimeout(() => {
      saveBlueprint(lists, true, newDate);
    }, 100);
  }, [lists, saveBlueprint]);

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
    componentOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    savedBlueprint
  };
};
