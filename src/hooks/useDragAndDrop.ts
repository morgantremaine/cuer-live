import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  UniqueIdentifier
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { RundownItem } from '@/types/rundown';

interface DragInfo {
  draggedIds: string[];
  isHeaderGroup: boolean;
  originalIndex: number;
}

export const useDragAndDrop = (
  items: RundownItem[], 
  setItems: (items: RundownItem[]) => void,
  getSelectedRows: () => Set<string>,
  scrollContainerRef?: React.RefObject<HTMLElement>,
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void,
  columns?: any[],
  title?: string,
  getHeaderGroupItemIds?: (headerId: string) => string[],
  isHeaderCollapsed?: (headerId: string) => boolean,
  markStructuralChange?: () => void,
  rundownId?: string | null,
  currentUserId?: string | null
) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Legacy state for compatibility
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  
  // Ref to track if we're currently in a drag operation
  const isDragActiveRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  // Setup @dnd-kit sensors with better activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Centralized state reset function
  const resetDragState = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 === RESETTING DRAG STATE ===');
      console.log('🎯 Previous state:', {
        activeId,
        draggedItemIndex,
        isDraggingMultiple,
        dropTargetIndex,
        isDragActive: isDragActiveRef.current
      });
    }
    
    setActiveId(null);
    setDragInfo(null);
    setDraggedItemIndex(null);
    setIsDraggingMultiple(false);
    setDropTargetIndex(null);
    isDragActiveRef.current = false;
    
    // Clear any pending timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = undefined;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Drag state reset complete');
    }
  }, [activeId, draggedItemIndex, isDraggingMultiple, dropTargetIndex]);

  // Auto-cleanup timeout to prevent stuck states
  const setDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Set a 45-second timeout to force reset if drag gets stuck
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Setting 45-second drag timeout');
    }
    dragTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ DRAG TIMEOUT: Force resetting stuck drag state after 45 seconds');
      resetDragState();
    }, 45000);
  }, [resetDragState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const renumberItems = useCallback((items: RundownItem[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔢 === RENUMBERING ITEMS ===');
      console.log('🔢 Before renumbering:', items.map(item => ({
        id: item.id.slice(-6),
        type: item.type,
        name: item.name?.slice(0, 20),
        rowNumber: item.rowNumber
      })));
    }
    
    let headerIndex = 0;
    let regularItemIndex = 1;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    const result = items.map(item => {
      if (item.type === 'header') {
        const newHeaderLetter = letters[headerIndex] || 'A';
        headerIndex++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔢 Header ${item.id.slice(-6)}: ${item.rowNumber} → ${newHeaderLetter}`);
        }
        return {
          ...item,
          rowNumber: newHeaderLetter,
          segmentName: newHeaderLetter
        };
      } else {
        // Renumber regular items sequentially (1, 2, 3, etc.)
        const newRowNumber = regularItemIndex.toString();
        regularItemIndex++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔢 Regular ${item.id.slice(-6)}: ${item.rowNumber} → ${newRowNumber}`);
        }
        return {
          ...item,
          rowNumber: newRowNumber
        };
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔢 After renumbering:', result.map(item => ({
        id: item.id.slice(-6),
        type: item.type,
        name: item.name?.slice(0, 20),
        rowNumber: item.rowNumber
      })));
    }
    
    return result;
  }, []);

  // @dnd-kit drag start handler
  const handleDndKitDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeIndex = items.findIndex(item => item.id === active.id);
    const item = items[activeIndex];
    const selectedRows = getSelectedRows();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 === DRAG START ===');
      console.log('🎯 Dragged item:', {
        id: active.id,
        index: activeIndex,
        type: item?.type,
        name: item?.name,
        rowNumber: item?.rowNumber
      });
      console.log('🎯 Total items in rundown:', items.length);
      console.log('🎯 Selected rows count:', selectedRows.size);
    }

    if (!item) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚨 DRAG ERROR: Item not found for id:', active.id);
      }
      return;
    }

    let draggedIds: string[] = [];
    let isHeaderGroup = false;
    
    // Check if it's a collapsed header group - ONLY when collapsed
    if (item.type === 'header' && getHeaderGroupItemIds && isHeaderCollapsed && isHeaderCollapsed(item.id)) {
      draggedIds = getHeaderGroupItemIds(item.id);
      isHeaderGroup = draggedIds.length > 1;
      
      // DEFENSIVE VALIDATION: Verify all IDs exist in current items array
      const validDraggedIds = draggedIds.filter(id => items.find(i => i.id === id));
      const missingIds = draggedIds.filter(id => !items.find(i => i.id === id));
      
      if (missingIds.length > 0) {
        console.warn('⚠️ VALIDATION: Some header group IDs missing from current items:', {
          headerId: item.id,
          expected: draggedIds.length,
          valid: validDraggedIds.length,
          missingIds
        });
      }
      
      draggedIds = validDraggedIds;
      
      console.log('🎯 HEADER GROUP DRAG - Collapsed header detected:', {
        headerId: item.id,
        isCollapsed: isHeaderCollapsed(item.id),
        itemCount: draggedIds.length,
        itemIds: draggedIds,
        currentItemPositions: draggedIds.map(id => {
          const idx = items.findIndex(i => i.id === id);
          const foundItem = items[idx];
          return {
            id: id.slice(-6),
            position: idx,
            name: foundItem?.name || 'Unknown',
            type: foundItem?.type
          };
        })
      });
      
      if (draggedIds.length === 0) {
        console.warn('🚨 HEADER GROUP ERROR: No valid items found for collapsed header:', item.id);
        // Fall back to single item drag
        draggedIds = [item.id];
        isHeaderGroup = false;
      }
    } else if (selectedRows.size > 1 && selectedRows.has(item.id)) {
      // Multiple selection
      draggedIds = Array.from(selectedRows);
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Dragging multiple selected items:', {
          count: draggedIds.length,
          itemIds: draggedIds
        });
      }
    } else {
      // Single item
      draggedIds = [item.id];
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Dragging single item:', item.id);
      }
    }
    
    setActiveId(active.id);
    setDraggedItemIndex(activeIndex);
    setIsDraggingMultiple(draggedIds.length > 1);
    setDragInfo({
      draggedIds,
      isHeaderGroup,
      originalIndex: activeIndex
    });
    setDragTimeout();
    isDragActiveRef.current = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Drag state set:', {
        activeId: active.id,
        draggedItemIndex: activeIndex,
        isDraggingMultiple: draggedIds.length > 1,
        isHeaderGroup
      });
    }
   }, [items, getSelectedRows, getHeaderGroupItemIds, isHeaderCollapsed, setDragTimeout]);

  // @dnd-kit drag end handler
  const handleDndKitDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 === DRAG END ===');
    console.log('🎯 Drag end event:', {
      activeId: active.id,
      overId: over?.id,
      hasDragInfo: !!dragInfo,
      dropTargetIndex,
      isDragActive: isDragActiveRef.current
    });
    
    if (!over || !dragInfo || active.id === over.id) {
      console.log('🎯 Drag cancelled or invalid:', {
        hasOver: !!over,
        hasDragInfo: !!dragInfo,
        sameElement: active.id === over.id
      });
      resetDragState();
      return;
    }

    const activeIndex = items.findIndex(item => item.id === active.id);
    let overIndex = items.findIndex(item => item.id === over.id);
    
    console.log('🎯 Initial indices:', {
      activeIndex,
      overIndex,
      dropTargetIndex,
      itemsLength: items.length
    });
    
    // Use the calculated dropTargetIndex if available (from legacy drag over)
    // This provides more precise drop positioning, especially for headers
    if (dropTargetIndex !== null && dropTargetIndex >= 0 && dropTargetIndex <= items.length) {
      console.log('🎯 Using precise dropTargetIndex:', dropTargetIndex, 'instead of overIndex:', overIndex);
      overIndex = dropTargetIndex;
    }
    
    if (activeIndex === -1 || overIndex === -1) {
      console.error('🚨 DRAG ERROR: Invalid indices:', { activeIndex, overIndex });
      resetDragState();
      return;
    }

    try {
      const { draggedIds, isHeaderGroup } = dragInfo;
      console.log('🎯 Processing drop:', {
        draggedCount: draggedIds.length,
        isHeaderGroup,
        fromIndex: activeIndex,
        toIndex: overIndex,
        draggedIds: draggedIds.slice(0, 5) // Show first 5 IDs
      });
      
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      if (draggedIds.length > 1) {
        // Get all dragged items in their CURRENT order from items array
        const draggedItems = draggedIds
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
        
        // DEFENSIVE VALIDATION: Warn if any items were missing
        if (draggedItems.length !== draggedIds.length) {
          console.warn('⚠️ DROP VALIDATION: Some dragged items missing:', {
            expected: draggedIds.length,
            found: draggedItems.length,
            missingIds: draggedIds.filter(id => !items.find(item => item.id === id))
          });
        }
          
        const remainingItems = items.filter(item => !draggedIds.includes(item.id));
        
        hasHeaderMoved = draggedItems.some(item => item.type === 'header');
        
        // Calculate the correct insertion point
        let adjustedDropIndex = overIndex;
        
        // If we're using dropTargetIndex, it's already the insertion index
        if (dropTargetIndex !== null && dropTargetIndex >= 0 && dropTargetIndex <= items.length) {
          // Find how many dragged items appear before the drop index
          const removedItemsBeforeDropIndex = items.slice(0, dropTargetIndex).filter(item => 
            draggedIds.includes(item.id)
          ).length;
          
          adjustedDropIndex = dropTargetIndex - removedItemsBeforeDropIndex;
        } else {
          // Legacy calculation for @dnd-kit overIndex
          const removedItemsBeforeDropIndex = items.slice(0, overIndex).filter(item => 
            draggedIds.includes(item.id)
          ).length;
          
          adjustedDropIndex = overIndex - removedItemsBeforeDropIndex;
        }
        
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
        if (dropTargetIndex !== null && dropTargetIndex >= 0 && dropTargetIndex <= items.length) {
          // Use precise insertion index
          const item = items[activeIndex];
          const remainingItems = items.filter((_, index) => index !== activeIndex);
          
          let insertIndex = dropTargetIndex;
          if (activeIndex < dropTargetIndex) {
            insertIndex = dropTargetIndex - 1;
          }
          
          newItems = [...remainingItems];
          newItems.splice(insertIndex, 0, item);
        } else {
          // Fallback to @dnd-kit's arrayMove
          newItems = arrayMove(items, activeIndex, overIndex);
        }
        
        const draggedItem = items[activeIndex];
        hasHeaderMoved = draggedItem?.type === 'header';
        actionDescription = `Reorder "${draggedItem?.name || 'row'}"`;
      }
      
      // Always renumber items after any drag operation to ensure proper sequencing
      console.log('🔢 Renumbering items after drag operation');
      const itemsBeforeRenumber = newItems.map(item => ({ id: item.id, rowNumber: item.rowNumber }));
      newItems = renumberItems(newItems);
      const itemsAfterRenumber = newItems.map(item => ({ id: item.id, rowNumber: item.rowNumber }));
      console.log('🔢 Row numbers before:', itemsBeforeRenumber.slice(0, 10));
      console.log('🔢 Row numbers after:', itemsAfterRenumber.slice(0, 10));
      
      if (saveUndoState && columns && title) {
        console.log('🎯 Saving undo state for action:', actionDescription);
        saveUndoState(items, columns, title, actionDescription);
      }
      
      console.log('🎯 Setting new items array, length:', newItems.length);
      setItems(newItems);
      console.log('🏗️ Drag operation completed, items updated');
      
      // Broadcast reorder for immediate realtime sync (dual broadcasting like add_row/copy)
      if (rundownId && currentUserId) {
        const order = newItems.map(item => item.id);
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:reorder',
          { order },
          currentUserId
        );
        console.log('📡 Broadcasting reorder for immediate sync:', {
          rundownId,
          orderLength: order.length,
          userId: currentUserId
        });
      }
      
      // Handle reorder via structural coordination if available (database persistence)
      if (markStructuralChange && typeof markStructuralChange === 'function') {
        const order = newItems.map(item => item.id);
        console.log('🏗️ Triggering structural operation for reorder (database persistence)');
        
        // Call structural change handler with reorder operation
        try {
          // Try to call as structural operation handler
          (markStructuralChange as any)('reorder', { order });
        } catch (error) {
          // Fallback to just marking structural change
          markStructuralChange();
        }
      }
      
    } catch (error) {
      console.error('🚨 DRAG ERROR: Exception during drag and drop:', error);
      console.error('🚨 Error details:', {
        dragInfo,
        activeIndex,
        overIndex,
        itemsLength: items.length
      });
    } finally {
      console.log('🎯 Resetting drag state');
      resetDragState();
    }
  }, [items, dragInfo, dropTargetIndex, setItems, saveUndoState, columns, title, renumberItems, resetDragState]);

  // Legacy HTML5 drag handlers for compatibility (now just call the @dnd-kit versions)
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    console.log('🎯 Legacy drag start called:', { index, itemsLength: items.length });
    
    // Prevent text selection from triggering drag
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    const isContentEditable = target.contentEditable === 'true';
    
    if (isTextInput || hasTextSelection || isContentEditable) {
      console.log('🎯 Legacy drag prevented:', { isTextInput, hasTextSelection, isContentEditable });
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Let @dnd-kit handle the actual drag logic
    const item = items[index];
    if (item) {
      console.log('🎯 Initiating dnd-kit drag for item:', item.id);
      // Simulate @dnd-kit drag start
      handleDndKitDragStart({
        active: { id: item.id, data: { current: {} }, rect: { current: {} } }
      } as DragStartEvent);
    } else {
      console.error('🚨 Legacy drag error: Item not found at index:', index);
    }
  }, [items, handleDndKitDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined && draggedItemIndex !== null && isDragActiveRef.current) {
      // Validate targetIndex is within bounds
      if (targetIndex < 0 || targetIndex >= items.length) {
        console.warn('⚠️ Drag over invalid target index:', {
          targetIndex,
          itemsLength: items.length
        });
        return; // Don't update dropTargetIndex with invalid value
      }
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      // Check if the target is a header
      const targetItem = items[targetIndex];
      const isTargetHeader = targetItem?.type === 'header';
      
      let insertIndex: number;
      
      if (isTargetHeader) {
        // For headers, be more generous about placing after
        // Use 40% threshold instead of 50% to make it easier to drop after headers
        const threshold = rect.top + rect.height * 0.4;
        insertIndex = mouseY < threshold ? targetIndex : targetIndex + 1;
      } else {
        // For regular items, use normal logic
        insertIndex = mouseY < rowMiddle ? targetIndex : targetIndex + 1;
      }
      
      // Clamp insertIndex to valid range [0, items.length]
      insertIndex = Math.max(0, Math.min(insertIndex, items.length));
      
      // Only update if different to avoid unnecessary re-renders
      if (insertIndex !== dropTargetIndex) {
        console.log('🎯 Drag over update:', {
          targetIndex,
          targetItemType: targetItem?.type,
          mouseY,
          rowMiddle: isTargetHeader ? rect.top + rect.height * 0.4 : rowMiddle,
          insertIndex,
          previousDropTarget: dropTargetIndex
        });
        setDropTargetIndex(insertIndex);
      }
    }
  }, [draggedItemIndex, dropTargetIndex, items]);

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
    
    console.log('🎯 Legacy drop called:', { 
      dropIndex, 
      draggedItemIndex, 
      isDragActive: isDragActiveRef.current,
      itemsLength: items.length 
    });
    
    try {
      if (!isDragActiveRef.current || draggedItemIndex === null) {
        console.log('🎯 Legacy drop ignored - no active drag');
        return; // resetDragState called in finally
      }

      // Validate drop index is within bounds
      if (dropIndex < 0 || dropIndex >= items.length) {
        console.error('🚨 Legacy drop error: Drop index out of bounds:', {
          dropIndex,
          itemsLength: items.length,
          draggedItemIndex
        });
        return; // resetDragState called in finally
      }

      // Simulate @dnd-kit drop by finding the target item
      const targetItem = items[dropIndex];
      if (targetItem) {
        console.log('🎯 Legacy drop simulating dnd-kit drop to:', targetItem.id);
        handleDndKitDragEnd({
          active: { id: items[draggedItemIndex].id },
          over: { id: targetItem.id }
        } as any);
      } else {
        console.error('🚨 Legacy drop error: Target item not found at index:', {
          dropIndex,
          itemsLength: items.length,
          targetItemExists: !!targetItem
        });
        // Don't throw - just log and reset in finally
      }
    } catch (error) {
      console.error('🚨 CRITICAL DROP ERROR:', error);
    } finally {
      // ALWAYS reset drag state, even if drop failed
      console.log('🎯 Drop completed - resetting drag state');
      resetDragState();
    }
  }, [draggedItemIndex, items, handleDndKitDragEnd, resetDragState]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    console.log('🎯 Legacy drag end called');
    resetDragState();
  }, [resetDragState]);

  // Create sortable items list for @dnd-kit
  const sortableItems = useMemo(() => 
    items.map(item => item.id), 
    [items]
  );

  const isDragging = draggedItemIndex !== null && isDragActiveRef.current;

  return {
    // @dnd-kit context components and props
    DndContext,
    SortableContext, 
    sensors,
    sortableItems,
    dndKitDragStart: handleDndKitDragStart,
    dndKitDragEnd: handleDndKitDragEnd,
    modifiers: [restrictToVerticalAxis],
    collisionDetection: closestCenter,
    activeId,
    
    // Legacy compatibility
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    isDragging,
    handleDragStart, // Legacy HTML5 handler
    handleDragOver,
    handleDragLeave,
    handleDrop, // Legacy HTML5 handler
    handleDragEnd, // Legacy HTML5 handler
    resetDragState
  };
};