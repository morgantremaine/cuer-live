
import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Ref to track if we're currently in a drag operation
  const isDragActiveRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();
  const dragEndTimeoutRef = useRef<NodeJS.Timeout>();

  // Centralized state reset function with better timeout clearing
  const resetDragState = useCallback(() => {
    console.log('🔄 Resetting drag state');
    
    // Clear timeouts FIRST to prevent them from firing
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
    
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
      dragEndTimeoutRef.current = undefined;
    }
    
    // Then reset all state
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
    isDragActiveRef.current = false;
    
    // Notify autosave that drag is no longer active
    if (setDragActive) {
      setDragActive(false);
    }
  }, [setDragActive]);

  // Auto-cleanup timeout to prevent stuck states
  const setDragTimeout = useCallback(() => {
    // Clear any existing timeout first
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
    
    // Set a 3-second timeout to force reset if drag gets stuck
    dragTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Drag operation timed out, forcing reset');
      // Only reset if we're actually still dragging
      if (isDragActiveRef.current) {
        resetDragState();
      }
    }, 3000);
  }, [resetDragState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }
    };
  }, []);

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
    
    // Force reset any existing state first
    if (isDragActiveRef.current || dragTimeoutRef.current) {
      console.log('🔄 Force resetting existing drag state');
      resetDragState();
    }
    
    const item = items[index];
    if (!item) {
      console.error('❌ No item found at index:', index);
      return;
    }

    const isMultipleSelection = selectedRows.size > 1 && selectedRows.has(item.id);
    
    // Set state in the correct order
    isDragActiveRef.current = true;
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isMultipleSelection);
    
    // Set timeout after state is established
    setDragTimeout();
    
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
  }, [items, selectedRows, resetDragState, setDragTimeout, setDragActive]);

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
    
    // Immediately clear the timeout to prevent it from firing
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
    
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
    
    // Clear any existing dragEnd timeout first
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
      dragEndTimeoutRef.current = undefined;
    }
    
    // Only reset if we're still in drag state after a very brief delay
    // This handles the case where dragEnd fires but no drop occurred
    dragEndTimeoutRef.current = setTimeout(() => {
      // Only reset if isDragActiveRef is still true (meaning no drop occurred)
      if (isDragActiveRef.current) {
        console.log('🔄 Drag end - resetting state (no drop occurred)');
        resetDragState();
      }
    }, 50); // Small delay to allow drop to fire first
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
