
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
  getHeaderGroupItemIds?: (headerId: string) => string[],
  isHeaderCollapsed?: (headerId: string) => boolean
) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Ref to track if we're currently in a drag operation
  const isDragActiveRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  // Centralized state reset function
  const resetDragState = useCallback(() => {
    console.log('🔄 Resetting drag state');
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
    isDragActiveRef.current = false;
    
    // Clear any pending timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
  }, []);

  // Auto-cleanup timeout to prevent stuck states
  const setDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Set a 10-second timeout to force reset if drag gets stuck
    dragTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Drag operation timed out, forcing reset');
      resetDragState();
    }, 10000);
  }, [resetDragState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
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
    
    // Reset any existing state first
    resetDragState();
    
    const item = items[index];
    if (!item) {
      console.error('❌ No item found at index:', index);
      return;
    }

    let draggedIds: string[] = [];
    let isMultipleSelection = false;
    
    // Check if it's a collapsed header group
    if (item.type === 'header' && getHeaderGroupItemIds && isHeaderCollapsed && isHeaderCollapsed(item.id)) {
      // Drag the entire header group
      draggedIds = getHeaderGroupItemIds(item.id);
      isMultipleSelection = draggedIds.length > 1;
    } else if (selectedRows.size > 1 && selectedRows.has(item.id)) {
      // Multiple selection
      draggedIds = Array.from(selectedRows);
      isMultipleSelection = true;
    } else {
      // Single item
      draggedIds = [item.id];
      isMultipleSelection = false;
    }
    
    isDragActiveRef.current = true;
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isMultipleSelection);
    setDragTimeout();
    
    e.dataTransfer.effectAllowed = 'move';
    
    // Set both formats for compatibility
    const dragInfo = {
      draggedIndex: index,
      isMultiple: isMultipleSelection,
      selectedIds: draggedIds,
      isHeaderGroup: item.type === 'header' && draggedIds.length > 1,
      headerGroupIds: item.type === 'header' && draggedIds.length > 1 ? draggedIds : undefined
    };
    
    e.dataTransfer.setData('text/plain', JSON.stringify(dragInfo));
    e.dataTransfer.setData('application/json', JSON.stringify(dragInfo));

    console.log('✅ Drag started - multiple:', isMultipleSelection, 'ids:', draggedIds, 'isHeaderGroup:', dragInfo.isHeaderGroup);
  }, [items, selectedRows, resetDragState, setDragTimeout, getHeaderGroupItemIds, isHeaderCollapsed]);

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
        const jsonData = e.dataTransfer.getData('application/json');
        
        // Try JSON first (newer format), then fall back to text/plain
        if (jsonData) {
          dragData = JSON.parse(jsonData);
        } else if (dragDataString) {
          dragData = JSON.parse(dragDataString);
        } else {
          dragData = { isMultiple: false, selectedIds: [], isHeaderGroup: false };
        }
      } catch (error) {
        console.warn('Failed to parse drag data:', error);
        dragData = { isMultiple: false, selectedIds: [], isHeaderGroup: false };
      }

      const { isMultiple, selectedIds, isHeaderGroup, headerGroupIds } = dragData;
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      // Handle header group dragging (collapsed headers)
      if (isHeaderGroup && headerGroupIds && headerGroupIds.length > 1) {
        console.log('🔗 Processing header group drag with IDs:', headerGroupIds);
        
        // Get all items in the group in their original order
        const groupItems = headerGroupIds
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
          
        const nonGroupItems = items.filter(item => !headerGroupIds.includes(item.id));
        
        hasHeaderMoved = groupItems.some(item => item.type === 'header');
        
        // Insert the entire group at the drop position
        newItems = [...nonGroupItems];
        newItems.splice(dropIndex, 0, ...groupItems);
        
        actionDescription = `Reorder header group (${groupItems.length} items)`;
        
      } else if (isMultiple && selectedIds && selectedIds.length > 1) {
        // Regular multi-selection
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
      
    } catch (error) {
      console.error('❌ Error during drop operation:', error);
    } finally {
      // Always reset state after drop attempt
      resetDragState();
    }
  }, [draggedItemIndex, items, resetDragState, setItems, saveUndoState, columns, title]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('🏁 Drag end triggered');
    resetDragState();
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
