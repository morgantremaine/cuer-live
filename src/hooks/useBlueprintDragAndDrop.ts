
import { useState } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintDragAndDrop = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  saveBlueprint: (rundownTitle: string, lists: BlueprintList[], silent?: boolean) => void,
  rundownTitle: string
) => {
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  // Create unified items array for drag and drop calculations
  const allItems = [
    ...lists.map(list => ({ type: 'list', id: list.id, data: list })),
    { type: 'crew-list', id: 'crew-list', data: null },
    { type: 'scratchpad', id: 'scratchpad', data: null }
  ];

  const handleDragStart = (e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterContainer = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      const draggedIndex = allItems.findIndex(item => item.id === draggedListId);
      
      // Calculate the insertion index based on mouse position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const elementCenter = rect.top + rect.height / 2;
      
      let targetIndex = index;
      if (mouseY > elementCenter) {
        targetIndex = index + 1;
      }
      
      // Adjust for the dragged item's original position
      if (draggedIndex !== -1 && draggedIndex < targetIndex) {
        targetIndex -= 1;
      }
      
      setInsertionIndex(targetIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear insertion index if we're leaving the entire container area
    const container = document.querySelector('[data-drop-container]');
    if (container && !container.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Only handle reordering of regular lists - crew list and scratchpad maintain fixed positions
    const draggedIndex = lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Calculate new position within the lists array
    let newListIndex = insertionIndex;
    
    // Adjust for crew list and scratchpad positions
    const itemsBeforeInsertion = allItems.slice(0, insertionIndex);
    const nonListItemsBeforeInsertion = itemsBeforeInsertion.filter(item => item.type !== 'list').length;
    newListIndex = insertionIndex - nonListItemsBeforeInsertion;

    // Ensure we don't go beyond array bounds
    newListIndex = Math.max(0, Math.min(newListIndex, lists.length));

    // Create new array with reordered lists
    const newLists = [...lists];
    const [draggedList] = newLists.splice(draggedIndex, 1);
    newLists.splice(newListIndex, 0, draggedList);

    setLists(newLists);
    saveBlueprint(rundownTitle, newLists, true);

    setDraggedListId(null);
    setInsertionIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedListId(null);
    setInsertionIndex(null);
  };

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
