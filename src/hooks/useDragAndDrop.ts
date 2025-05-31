
import { useState } from 'react';
import { RundownItem } from './useRundownItems';

export const useDragAndDrop = (
  items: RundownItem[], 
  setItems: (items: RundownItem[]) => void,
  selectedRows: Set<string>
) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const item = items[index];
    const isMultipleSelection = selectedRows.size > 1 && selectedRows.has(item.id);
    
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isMultipleSelection);
    e.dataTransfer.effectAllowed = 'move';
    
    // Store drag data
    e.dataTransfer.setData('text/plain', JSON.stringify({
      draggedIndex: index,
      isMultiple: isMultipleSelection,
      selectedIds: Array.from(selectedRows)
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItemIndex === null) {
      setDraggedItemIndex(null);
      setIsDraggingMultiple(false);
      return;
    }

    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { isMultiple, selectedIds } = dragData;

    if (isMultiple && selectedIds.length > 1) {
      // Handle multiple item drag
      const selectedItems = items.filter(item => selectedIds.includes(item.id));
      const nonSelectedItems = items.filter(item => !selectedIds.includes(item.id));
      
      // Insert selected items at the drop position
      const newItems = [...nonSelectedItems];
      newItems.splice(dropIndex, 0, ...selectedItems);
      
      setItems(newItems);
    } else {
      // Handle single item drag (existing logic)
      if (draggedItemIndex === dropIndex) {
        setDraggedItemIndex(null);
        setIsDraggingMultiple(false);
        return;
      }

      const newItems = [...items];
      const draggedItem = newItems[draggedItemIndex];
      
      newItems.splice(draggedItemIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      
      setItems(newItems);
    }
    
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
  };

  return {
    draggedItemIndex,
    isDraggingMultiple,
    handleDragStart,
    handleDragOver,
    handleDrop
  };
};
