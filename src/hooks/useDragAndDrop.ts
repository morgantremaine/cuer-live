
import { useState } from 'react';
import { RundownItem } from './useRundownItems';

export const useDragAndDrop = (
  items: RundownItem[], 
  setItems: (items: RundownItem[]) => void,
  selectedRows: Set<string>
) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const renumberItems = (items: RundownItem[]) => {
    let headerIndex = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    return items.map(item => {
      if (item.type === 'header') {
        const newHeaderLetter = letters[headerIndex] || 'A';
        headerIndex++;
        return {
          ...item,
          rowNumber: newHeaderLetter,
          segmentName: newHeaderLetter
        };
      } else {
        return item;
      }
    });
  };

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

  const handleDragOver = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined && draggedItemIndex !== null) {
      // Calculate the drop position based on mouse position relative to row
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      // If mouse is in the top half, insert before this row
      // If mouse is in the bottom half, insert after this row
      const insertIndex = mouseY < rowMiddle ? targetIndex : targetIndex + 1;
      
      setDropTargetIndex(insertIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're leaving the table area
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    setDropTargetIndex(null);
    
    if (draggedItemIndex === null) {
      setDraggedItemIndex(null);
      setIsDraggingMultiple(false);
      return;
    }

    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { isMultiple, selectedIds } = dragData;

    let newItems: RundownItem[];
    let hasHeaderMoved = false;

    if (isMultiple && selectedIds.length > 1) {
      // Handle multiple item drag
      const selectedItems = items.filter(item => selectedIds.includes(item.id));
      const nonSelectedItems = items.filter(item => !selectedIds.includes(item.id));
      
      // Check if any selected items are headers
      hasHeaderMoved = selectedItems.some(item => item.type === 'header');
      
      // Insert selected items at the drop position
      newItems = [...nonSelectedItems];
      newItems.splice(dropIndex, 0, ...selectedItems);
    } else {
      // Handle single item drag (existing logic)
      if (draggedItemIndex === dropIndex) {
        setDraggedItemIndex(null);
        setIsDraggingMultiple(false);
        return;
      }

      const draggedItem = items[draggedItemIndex];
      hasHeaderMoved = draggedItem.type === 'header';

      newItems = [...items];
      newItems.splice(draggedItemIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
    }
    
    // If any headers were moved, renumber all headers
    if (hasHeaderMoved) {
      newItems = renumberItems(newItems);
    }
    
    setItems(newItems);
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
  };

  return {
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
