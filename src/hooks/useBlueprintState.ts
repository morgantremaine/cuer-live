
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

  // Update checked items
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save silently after a delay
      setTimeout(() => {
        saveBlueprint(rundownTitle, updatedLists, showDate, true);
      }, 500);
      
      return updatedLists;
    });
  }, [saveBlueprint, rundownTitle, showDate]);

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
      saveBlueprint(rundownTitle, updatedLists, showDate, false);
      return updatedLists;
    });
  }, [items, generateListId, saveBlueprint, rundownTitle, showDate]);

  // Delete list
  const deleteList = useCallback((listId: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.filter(list => list.id !== listId);
      saveBlueprint(rundownTitle, updatedLists, showDate, false);
      return updatedLists;
    });
  }, [saveBlueprint, rundownTitle, showDate]);

  // Rename list
  const renameList = useCallback((listId: string, newName: string) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, name: newName } : list
      );
      saveBlueprint(rundownTitle, updatedLists, showDate, true);
      return updatedLists;
    });
  }, [saveBlueprint, rundownTitle, showDate]);

  // Refresh all lists
  const refreshAllLists = useCallback(() => {
    setLists(currentLists => {
      const refreshedLists = currentLists.map(list => ({
        ...list,
        items: generateListFromColumn(items, list.sourceColumn)
      }));
      saveBlueprint(rundownTitle, refreshedLists, showDate, true);
      return refreshedLists;
    });
  }, [items, saveBlueprint, rundownTitle, showDate]);

  // Update show date
  const updateShowDate = useCallback((newDate: string) => {
    setShowDate(newDate);
    setTimeout(() => {
      saveBlueprint(rundownTitle, lists, newDate, true);
    }, 100);
  }, [lists, saveBlueprint, rundownTitle]);

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
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    savedBlueprint
  };
};
