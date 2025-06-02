
import { useState } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintDragAndDrop = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  saveBlueprint: (rundownTitle: string, lists: BlueprintList[], silent?: boolean) => void,
  rundownTitle: string
) => {
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(targetIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're leaving the container area
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === draggedListId) {
      setDraggedListId(null);
      setDropTargetIndex(null);
      return;
    }

    const draggedIndex = lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedListId(null);
      setDropTargetIndex(null);
      return;
    }

    // Create new array with reordered lists
    const newLists = [...lists];
    const [draggedList] = newLists.splice(draggedIndex, 1);
    newLists.splice(dropIndex, 0, draggedList);

    setLists(newLists);
    saveBlueprint(rundownTitle, newLists, true);

    setDraggedListId(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedListId(null);
    setDropTargetIndex(null);
  };

  return {
    draggedListId,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
};
