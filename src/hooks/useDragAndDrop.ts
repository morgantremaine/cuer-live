
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
    
    // Check if enhanced handler already set drag data
    const existingData = e.dataTransfer.getData('text/plain');
    if (existingData) {
      console.log('✅ Enhanced drag data already exists, not overwriting:', existingData);
      return; // Don't overwrite the enhanced data
    }
    
    // Store drag info with header group detection
    const dragInfo = {
      draggedIds,
      isHeaderGroup: item.type === 'header' && isMultipleSelection,
      originalIndex: index
    };
    
    e.dataTransfer.setData('text/plain', JSON.stringify(dragInfo));

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
      const dragDataString = e.dataTransfer.getData('text/plain');
      let dragInfo = { draggedIds: [], isHeaderGroup: false, originalIndex: -1, enhancedHandlerUsed: false };
      
      try {
        dragInfo = JSON.parse(dragDataString);
      } catch (error) {
        console.warn('Failed to parse drag data, using fallback');
      }

      const { draggedIds, isHeaderGroup, enhancedHandlerUsed } = dragInfo;
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      console.log('📋 Processing drop with drag info:', dragInfo);

      if (draggedIds.length > 1) {
        console.log('🔗 Processing multi-item drag:', isHeaderGroup ? 'header group' : 'selection', 'IDs:', draggedIds);
        
        // Get all dragged items in their original order
        const draggedItems = draggedIds
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
          
        const remainingItems = items.filter(item => !draggedIds.includes(item.id));
        
        hasHeaderMoved = draggedItems.some(item => item.type === 'header');
        
        // Calculate the correct insertion point
        let adjustedDropIndex = dropIndex;
        
        // Count how many dragged items are before the drop index
        const draggedItemIndices = draggedIds
          .map((id: string) => items.findIndex(item => item.id === id))
          .filter(index => index !== -1)
          .sort((a, b) => a - b);
        
        const removedItemsBeforeDropIndex = draggedItemIndices.filter(index => index < dropIndex).length;
        adjustedDropIndex = dropIndex - removedItemsBeforeDropIndex;
        
        // Ensure we don't go out of bounds
        adjustedDropIndex = Math.max(0, Math.min(adjustedDropIndex, remainingItems.length));
        
        // Insert all items at the adjusted drop position
        newItems = [...remainingItems];
        newItems.splice(adjustedDropIndex, 0, ...draggedItems);
        
        actionDescription = isHeaderGroup ? 
          `Reorder header group (${draggedItems.length} items)` : 
          `Reorder ${draggedItems.length} items`;
      } else {
        // Single item
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
        
        // Calculate correct drop position for single item
        let adjustedDropIndex = dropIndex;
        if (draggedItemIndex < dropIndex) {
          // Moving forward, subtract 1 because we removed the item
          adjustedDropIndex = dropIndex - 1;
        }
        // Ensure we don't go out of bounds
        adjustedDropIndex = Math.max(0, Math.min(adjustedDropIndex, newItems.length));
        newItems.splice(adjustedDropIndex, 0, draggedItem);
        
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
