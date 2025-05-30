
import { useState } from 'react';
import { RundownItem } from './useRundownItems';

export const useDragAndDrop = (items: RundownItem[], setItems: (items: RundownItem[]) => void) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) {
      setDraggedItemIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedItemIndex];
    
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setItems(newItems);
    setDraggedItemIndex(null);
  };

  return {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  };
};
