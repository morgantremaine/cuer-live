import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

export const useDragAndDrop = (
  items: RundownItem[], 
  setItems: (items: RundownItem[]) => void,
  selectedRows: Set<string>,
  scrollContainerRef?: React.RefObject<HTMLElement>,
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void,
  columns?: any[],
  title?: string,
  setDragActive?: (active: boolean) => void
) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Simple ref to track if we're dragging
  const isDragActiveRef = useRef(false);

  // Simple state reset function
  const resetDragState = useCallback(() => {
    console.log('🔄 Resetting drag state');
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
    isDragActiveRef.current = false;
    
    // Notify autosave that drag is no longer active
    if (setDragActive) {
      setDragActive(false);
    }
  }, [setDragActive]);

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

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    console.log('🚀 Drag start - index:', index);
    
    const item = items[index];
    if (!item) {
      console.error('❌ No item found at index:', index);
      return;
    }

    const isMultipleSelection = selectedRows.size > 1 && selectedRows.has(item.id);
    
    // Set state
    isDragActiveRef.current = true;
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isMultipleSelection);
    
    // Notify autosave that drag is active
    if (setDragActive) {
      setDragActive(true);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      draggedIndex: index,
      isMultiple: isMultipleSelection,
      selectedIds: Array.from(selectedRows)
    }));

    console.log('✅ Drag started - multiple:', isMultipleSelection);
  }, [items, selectedRows, setDragActive]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined && draggedItemIndex !== null && isDragActiveRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      const insertIndex = mouseY < rowMiddle ? targetIndex : targetIndex + 1;
      
      // Only update if different to avoid unnecessary re-renders
      if (insertIndex !== dropTargetIndex) {
        setDropTargetIndex(insertIndex);
      }
    }
  }, [draggedItemIndex, dropTargetIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    const buffer = 10;
    if (x < rect.left - buffer || x > rect.right + buffer || 
        y < rect.top - buffer || y > rect.bottom + buffer) {
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Drop triggered - draggedIndex:', draggedItemIndex, 'dropIndex:', dropIndex);
    
    if (!isDragActiveRef.current || draggedItemIndex === null) {
      console.warn('⚠️ Drop ignored - no active drag or null draggedIndex');
      resetDragState();
      return;
    }

    try {
      let dragData;
      try {
        const dragDataString = e.dataTransfer.getData('text/plain');
        dragData = dragDataString ? JSON.parse(dragDataString) : { isMultiple: false, selectedIds: [] };
      } catch (error) {
        console.warn('Failed to parse drag data:', error);
        dragData = { isMultiple: false, selectedIds: [] };
      }

      const { isMultiple, selectedIds } = dragData;
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      if (isMultiple && selectedIds && selectedIds.length > 1) {
        const selectedItems = items.filter(item => selectedIds.includes(item.id));
        const nonSelectedItems = items.filter(item => !selectedIds.includes(item.id));
        
        hasHeaderMoved = selectedItems.some(item => item.type === 'header');
        
        newItems = [...nonSelectedItems];
        newItems.splice(dropIndex, 0, ...selectedItems);
        
        actionDescription = `Reorder ${selectedItems.length} rows`;
      } else {
        if (draggedItemIndex === dropIndex) {
          console.log('🔄 Same position drop, ignoring');
          resetDragState();
          return;
        }

        const draggedItem = items[draggedItemIndex];
        if (!draggedItem) {
          console.error('❌ Dragged item not found');
          resetDragState();
          return;
        }

        hasHeaderMoved = draggedItem.type === 'header';

        newItems = [...items];
        newItems.splice(draggedItemIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        
        actionDescription = `Reorder "${draggedItem.name || 'row'}"`;
      }
      
      if (hasHeaderMoved) {
        newItems = renumberItems(newItems);
      }
      
      if (saveUndoState && columns && title) {
        saveUndoState(items, columns, title, actionDescription);
      }
      
      console.log('✅ Updating items with new order');
      setItems(newItems);
      
      // Reset state immediately after successful drop
      resetDragState();
      
    } catch (error) {
      console.error('❌ Error during drop operation:', error);
      resetDragState();
    }
  }, [draggedItemIndex, items, resetDragState, setItems, saveUndoState, columns, title]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('🏁 Drag end triggered');
    
    // Simple approach: if we're still marked as dragging, reset
    if (isDragActiveRef.current) {
      console.log('🔄 Drag end - resetting state (no drop occurred)');
      resetDragState();
    }
  }, [resetDragState]);

  const isDragging = draggedItemIndex !== null && isDragActiveRef.current;

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
    resetDragState
  };
};