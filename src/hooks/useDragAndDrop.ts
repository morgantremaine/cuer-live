
import { useState, useCallback } from 'react';
import { RundownItem } from './useRundownItems';
import { useDragStateSafety } from './useDragStateSafety';

export const useDragAndDrop = (
  items: RundownItem[], 
  setItems: (items: RundownItem[]) => void,
  selectedRows: Set<string>,
  scrollContainerRef?: React.RefObject<HTMLElement>
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

  // Comprehensive state clearing function with debugging
  const clearDragState = useCallback(() => {
    console.log('🧹 Clearing drag state:', { 
      draggedItemIndex, 
      isDraggingMultiple, 
      dropTargetIndex 
    });
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
  }, [draggedItemIndex, isDraggingMultiple, dropTargetIndex]);

  // Use safety hook to prevent stuck drag states
  useDragStateSafety(draggedItemIndex, clearDragState);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('🚀 Drag start - index:', index);
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
    console.log('📦 Drop event - dropIndex:', dropIndex, 'draggedItemIndex:', draggedItemIndex);
    
    // Clear drop target immediately
    setDropTargetIndex(null);
    
    if (draggedItemIndex === null) {
      console.log('⚠️ No dragged item index, clearing state');
      clearDragState();
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
        console.log('📍 Same position drop, clearing state');
        clearDragState();
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
    
    console.log('✅ Drop successful, updating items and clearing state');
    setItems(newItems);
    
    // Clear drag state immediately after successful drop
    clearDragState();
  };

  // Enhanced drag end handler with more aggressive clearing
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🏁 Drag end event triggered');
    
    // Clear all drag state immediately
    clearDragState();
    
    // Add multiple fallbacks to ensure state is cleared
    setTimeout(() => {
      console.log('🏁 Drag end timeout fallback 1');
      setDraggedItemIndex(null);
      setIsDraggingMultiple(false);
      setDropTargetIndex(null);
    }, 0);
    
    setTimeout(() => {
      console.log('🏁 Drag end timeout fallback 2');
      setDraggedItemIndex(null);
      setIsDraggingMultiple(false);
      setDropTargetIndex(null);
    }, 100);
  }, [clearDragState]);

  const isDragging = draggedItemIndex !== null;

  // Helper function to get drop indicator style
  const getDropIndicatorStyle = (index: number) => {
    if (dropTargetIndex === index) {
      return 'border-t-4 border-blue-500'; // Thicker blue line above the target row
    }
    return '';
  };

  // Debug logging for state changes
  console.log('🎯 Drag state:', { 
    draggedItemIndex, 
    isDraggingMultiple, 
    dropTargetIndex, 
    isDragging 
  });

  return {
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    clearDragState,
    getDropIndicatorStyle
  };
};
