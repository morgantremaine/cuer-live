
import { useState, useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintDragDrop = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  saveBlueprint: (lists: BlueprintList[], silent?: boolean, showDateOverride?: string, notesOverride?: string, crewDataOverride?: any, cameraPlots?: any, componentOrder?: string[]) => void,
  getCurrentComponentOrder: () => string[]
) => {
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnterContainer = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setInsertionIndex(index);
  }, [draggedListId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain') || draggedListId;
    
    if (draggedId && insertionIndex !== null) {
      const currentIndex = lists.findIndex(list => list.id === draggedId);
      if (currentIndex === -1) {
        return;
      }

      // Create new array with proper ordering
      const newLists = [...lists];
      const [draggedItem] = newLists.splice(currentIndex, 1);
      
      // Adjust insertion index if moving from before to after
      const adjustedIndex = insertionIndex > currentIndex ? insertionIndex - 1 : insertionIndex;
      newLists.splice(adjustedIndex, 0, draggedItem);
      
      setLists(newLists);
      
      // Save with current component order to preserve all state
      const currentComponentOrder = getCurrentComponentOrder();
      setTimeout(() => {
        saveBlueprint(newLists, true, undefined, undefined, undefined, undefined, currentComponentOrder);
      }, 100);
    }
    
    setInsertionIndex(null);
  }, [draggedListId, insertionIndex, lists, setLists, saveBlueprint, getCurrentComponentOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedListId(null);
    setInsertionIndex(null);
  }, []);

  return {
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
};
