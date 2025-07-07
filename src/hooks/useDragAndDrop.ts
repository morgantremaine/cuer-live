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
import { RundownItem } from '@/types/rundown';

interface DragInfo {
  draggedIds: string[];
  isHeaderGroup: boolean;
  originalIndex: number;
}

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
  }, []);

  // Auto-cleanup timeout to prevent stuck states
  const setDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Set a 10-second timeout to force reset if drag gets stuck
    dragTimeoutRef.current = setTimeout(() => {
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

  const renumberItems = useCallback((items: RundownItem[]) => {
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
  }, []);

  // @dnd-kit drag start handler
  const handleDndKitDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeIndex = items.findIndex(item => item.id === active.id);
    const item = items[activeIndex];
    
    if (!item) return;

    let draggedIds: string[] = [];
    let isHeaderGroup = false;
    
    // Check if it's a collapsed header group
    if (item.type === 'header' && getHeaderGroupItemIds && isHeaderCollapsed && isHeaderCollapsed(item.id)) {
      draggedIds = getHeaderGroupItemIds(item.id);
      isHeaderGroup = draggedIds.length > 1;
    } else if (selectedRows.size > 1 && selectedRows.has(item.id)) {
      // Multiple selection
      draggedIds = Array.from(selectedRows);
    } else {
      // Single item
      draggedIds = [item.id];
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
  }, [items, selectedRows, getHeaderGroupItemIds, isHeaderCollapsed, setDragTimeout]);

  // @dnd-kit drag end handler
  const handleDndKitDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !dragInfo || active.id === over.id) {
      resetDragState();
      return;
    }

    const activeIndex = items.findIndex(item => item.id === active.id);
    const overIndex = items.findIndex(item => item.id === over.id);
    
    if (activeIndex === -1 || overIndex === -1) {
      resetDragState();
      return;
    }

    try {
      const { draggedIds, isHeaderGroup } = dragInfo;
      let newItems: RundownItem[];
      let hasHeaderMoved = false;
      let actionDescription = '';

      if (draggedIds.length > 1) {
        // Get all dragged items in their original order
        const draggedItems = draggedIds
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as RundownItem[];
          
        const remainingItems = items.filter(item => !draggedIds.includes(item.id));
        
        hasHeaderMoved = draggedItems.some(item => item.type === 'header');
        
        // Calculate the correct insertion point
        let adjustedDropIndex = overIndex;
        
        // Find how many dragged items appear before the drop index
        const removedItemsBeforeDropIndex = items.slice(0, overIndex).filter(item => 
          draggedIds.includes(item.id)
        ).length;
        
        adjustedDropIndex = overIndex - removedItemsBeforeDropIndex;
        
        // Ensure we don't go out of bounds
        adjustedDropIndex = Math.max(0, Math.min(adjustedDropIndex, remainingItems.length));
        
        // Insert all items at the adjusted drop position
        newItems = [...remainingItems];
        newItems.splice(adjustedDropIndex, 0, ...draggedItems);
        
        actionDescription = isHeaderGroup ? 
          `Reorder header group (${draggedItems.length} items)` : 
          `Reorder ${draggedItems.length} items`;
      } else {
        // Single item using @dnd-kit's arrayMove
        newItems = arrayMove(items, activeIndex, overIndex);
        
        const draggedItem = items[activeIndex];
        hasHeaderMoved = draggedItem?.type === 'header';
        actionDescription = `Reorder "${draggedItem?.name || 'row'}"`;
      }
      
      if (hasHeaderMoved) {
        newItems = renumberItems(newItems);
      }
      
      if (saveUndoState && columns && title) {
        saveUndoState(items, columns, title, actionDescription);
      }
      
      setItems(newItems);
      
    } catch (error) {
      console.warn('@dnd-kit drag and drop error:', error);
    } finally {
      resetDragState();
    }
  }, [items, dragInfo, setItems, saveUndoState, columns, title, renumberItems, resetDragState]);

  // Legacy HTML5 drag handlers for compatibility (now just call the @dnd-kit versions)
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    // Prevent text selection from triggering drag
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    const isContentEditable = target.contentEditable === 'true';
    
    if (isTextInput || hasTextSelection || isContentEditable) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Let @dnd-kit handle the actual drag logic
    const item = items[index];
    if (item) {
      // Simulate @dnd-kit drag start
      handleDndKitDragStart({
        active: { id: item.id, data: { current: {} }, rect: { current: {} } }
      } as DragStartEvent);
    }
  }, [items, handleDndKitDragStart]);

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
    
    if (!isDragActiveRef.current || draggedItemIndex === null) {
      resetDragState();
      return;
    }

    // Simulate @dnd-kit drop by finding the target item
    const targetItem = items[dropIndex];
    if (targetItem) {
      handleDndKitDragEnd({
        active: { id: items[draggedItemIndex].id },
        over: { id: targetItem.id }
      } as any);
    }
  }, [draggedItemIndex, items, handleDndKitDragEnd, resetDragState]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
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