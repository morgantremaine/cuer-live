
import { useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { generateListFromColumn } from '@/utils/blueprintUtils';
import { useAuth } from '@/hooks/useAuth';
import { useBlueprintCore } from '@/hooks/blueprint/useBlueprintCore';
import { useBlueprintUnifiedPersistence } from '@/hooks/blueprint/useBlueprintUnifiedPersistence';
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

  const { loadBlueprint, saveBlueprint } = useBlueprintUnifiedPersistence(
    rundownId,
    rundownTitle,
    showDate,
    savedBlueprint,
    setSavedBlueprint
  );

  // Create a simplified save function for lists only
  const saveLists = useCallback(async (updatedLists: BlueprintList[], silent?: boolean) => {
    await saveBlueprint(updatedLists, silent);
  }, [saveBlueprint]);

  const {
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useBlueprintDragDrop(lists, setLists, saveLists);

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
    saveLists,
    generateListId
  );

  // Update checked items with debouncing
  const updateCheckedItems = useCallback((listId: string, checkedItems: Record<string, boolean>) => {
    setLists(currentLists => {
      const updatedLists = currentLists.map(list => 
        list.id === listId ? { ...list, checkedItems } : list
      );
      
      // Save with a slight delay to allow for rapid successive changes
      setTimeout(() => {
        saveBlueprint(updatedLists, true);
      }, 300);
      
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
      saveBlueprint(undefined, true);
    }, 100);
  }, [saveBlueprint]);

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
    savedBlueprint,
    saveBlueprint // Expose the unified save function for other components
  };
};
