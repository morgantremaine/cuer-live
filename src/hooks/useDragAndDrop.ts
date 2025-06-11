
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
    
    console.log('🎯 Drag start - setting draggedItemIndex:', index, 'isMultiple:', isMultipleSelection);
    
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
    
    // Get the target row element
    const target = e.currentTarget as HTMLElement;
    const table = target.closest('table');
    if (!table) return;
    
    const rows = Array.from(table.querySelectorAll('tbody > tr')).filter(row => 
      !row.querySelector('[data-drop-indicator]')
    );
    
    // Find which row we're over
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as HTMLElement;
      const rect = row.getBoundingClientRect();
      const mouseY = e.clientY;
      
      if (mouseY >= rect.top && mouseY <= rect.bottom) {
        // Determine if we should insert before or after this row
        const rowMiddle = rect.top + rect.height / 2;
        const insertIndex = mouseY < rowMiddle ? i : i + 1;
        
        console.log('🎯 Setting dropTargetIndex to:', insertIndex, 'for row:', i, 'mouseY:', mouseY, 'rowMiddle:', rowMiddle);
        setDropTargetIndex(insertIndex);
        return;
      }
    }
    
    // If we're below all rows, insert at the end
    if (rows.length > 0) {
      setDropTargetIndex(rows.length);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're leaving the table area
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      console.log('🎯 Clearing dropTargetIndex - leaving table area');
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    console.log('🎯 Drop occurred - clearing drag state');
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
