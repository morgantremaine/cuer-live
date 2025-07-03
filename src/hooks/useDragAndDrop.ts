
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
  
  const isDragActiveRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  // Centralized state reset function
  const resetDragState = useCallback(() => {
    console.log('🔄 Resetting drag state');
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
    isDragActiveRef.current = false;
    
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
  }, []);

  // Auto-cleanup timeout
  const setDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
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
      draggedIds = getHeaderGroupItemIds(item.id);
      isMultipleSelection = draggedIds.length > 1;
      console.log('🔗 Dragging collapsed header group:', draggedIds);
    } else if (selectedRows.size > 1 && selectedRows.has(item.id)) {
      // Multiple selection
      draggedIds = Array.from(selectedRows);
      isMultipleSelection = true;
      console.log('🔗 Dragging multiple selected items:', draggedIds);
    } else {
      // Single item
      draggedIds = [item.id];
      isMultipleSelection = false;
      console.log('🎯 Dragging single item:', item.id);
    }
    
    isDragActiveRef.current = true;
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isMultipleSelection);
    setDragTimeout();
    
    e.dataTransfer.effectAllowed = 'move';
    
    const dragInfo = {
      draggedIds,
      isHeaderGroup: item.type === 'header' && isMultipleSelection,
      originalIndex: index
    };
    
    e.dataTransfer.setData('text/plain', JSON.stringify(dragInfo));
    console.log('✅ Drag started with info:', dragInfo);
  }, [items, selectedRows, resetDragState, setDragTimeout, getHeaderGroupItemIds, isHeaderCollapsed]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined && draggedItemIndex !== null && isDragActiveRef.current) {
      // Calculate precise drop position based on mouse position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      // Determine if we're dropping before or after this row
      let insertIndex: number;
      if (mouseY < rowMiddle) {
        // Drop BEFORE this row
        insertIndex = targetIndex;
      } else {
        // Drop AFTER this row
        insertIndex = targetIndex + 1;
      }
      
      // Clamp to valid range
      insertIndex = Math.max(0, Math.min(insertIndex, items.length));
      
      if (insertIndex !== dropTargetIndex) {
        console.log('🎯 Drop target updated:', insertIndex, 'at row', targetIndex, 'mouse:', mouseY < rowMiddle ? 'before' : 'after');
        setDropTargetIndex(insertIndex);
      }
    }
  }, [draggedItemIndex, dropTargetIndex, items.length]);

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
      console.warn('⚠️ Drop ignored - no active drag');
      resetDragState();
      return;
    }

    try {
      const dragDataString = e.dataTransfer.getData('text/plain');
      let dragInfo = { draggedIds: [], isHeaderGroup: false, originalIndex: -1 };
      
      try {
        dragInfo = JSON.parse(dragDataString);
      } catch (error) {
        console.warn('Failed to parse drag data, using fallback');
      }

      const { draggedIds, isHeaderGroup } = dragInfo;
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      console.log('📋 Processing drop with drag info:', dragInfo, 'dropIndex:', dropIndex);

      if (draggedIds.length > 1) {
        console.log('🔗 Processing multi-item drag');
        
        // Get all dragged items in their original order
        const draggedItems = draggedIds
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
          
        const remainingItems = items.filter(item => !draggedIds.includes(item.id));
        
        hasHeaderMoved = draggedItems.some(item => item.type === 'header');
        
        // Calculate proper insertion point
        let insertIndex = dropIndex;
        
        // Count how many dragged items are before the insertion point
        const draggedIndices = draggedIds
          .map((id: string) => items.findIndex(item => item.id === id))
          .filter(index => index !== -1)
          .sort((a, b) => a - b);
        
        const removedItemsBeforeInsert = draggedIndices.filter(index => index < insertIndex).length;
        insertIndex = Math.max(0, insertIndex - removedItemsBeforeInsert);
        insertIndex = Math.min(insertIndex, remainingItems.length);
        
        // Insert all items at the calculated position
        newItems = [...remainingItems];
        newItems.splice(insertIndex, 0, ...draggedItems);
        
        actionDescription = isHeaderGroup ? 
          `Reorder header group (${draggedItems.length} items)` : 
          `Reorder ${draggedItems.length} items`;
          
        console.log('✅ Multi-item drop completed, insertIndex:', insertIndex);
      } else {
        // Single item drag - SIMPLIFIED LOGIC
        const draggedItem = items[draggedItemIndex];
        if (!draggedItem) {
          console.error('❌ Dragged item not found');
          resetDragState();
          return;
        }

        hasHeaderMoved = draggedItem.type === 'header';

        // Simple approach: remove item, then insert at target position
        newItems = [...items];
        newItems.splice(draggedItemIndex, 1);
        
        // Calculate insertion index after removal
        let insertIndex = dropIndex;
        if (draggedItemIndex < dropIndex) {
          insertIndex = dropIndex - 1;
        }
        
        // Ensure valid bounds
        insertIndex = Math.max(0, Math.min(insertIndex, newItems.length));
        
        newItems.splice(insertIndex, 0, draggedItem);
        
        actionDescription = `Reorder "${draggedItem.name || 'row'}"`;
        
        console.log('✅ Single-item drop completed, originalIndex:', draggedItemIndex, 'finalIndex:', insertIndex);
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
