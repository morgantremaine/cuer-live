import { useState, useCallback, useRef, useEffect } from 'react';
import { Column } from '@/hooks/useColumnsManager';

export const useColumnDragDrop = (
  columns: Column[],
  onReorderColumns?: (columns: Column[]) => void
) => {
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Ref to track if we're currently in a drag operation
  const isDragActiveRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();

  // Centralized state reset function
  const resetDragState = useCallback(() => {
    setDraggedColumnId(null);
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

  const handleDragStart = useCallback((e: React.DragEvent, column: Column, index: number) => {
    // Ensure we're not resizing when starting drag
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
      e.preventDefault();
      return;
    }
    
    // Reset any existing state first
    resetDragState();
    
    try {
      isDragActiveRef.current = true;
      setDraggedColumnId(column.id);
      setDragTimeout();
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({
        columnId: column.id,
        originalIndex: index
      }));
      
      // Simple, reliable drag image
      const dragElement = e.currentTarget as HTMLElement;
      if (dragElement) {
        e.dataTransfer.setDragImage(dragElement, 10, 10);
      }
    } catch (error) {
      resetDragState();
    }
  }, [resetDragState, setDragTimeout]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (isDragActiveRef.current && draggedColumnId) {
      setDropTargetIndex(targetIndex);
    }
  }, [draggedColumnId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the header row entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    const buffer = 10;
    if (x < rect.left - buffer || x > rect.right + buffer || 
        y < rect.top - buffer || y > rect.bottom + buffer) {
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragActiveRef.current || !draggedColumnId || !onReorderColumns) {
      resetDragState();
      return;
    }

    try {
      const dragDataString = e.dataTransfer.getData('text/plain');
      let dragInfo = { columnId: '', originalIndex: -1 };
      
      try {
        dragInfo = JSON.parse(dragDataString);
      } catch (error) {
        // Fallback to current state
        dragInfo = { columnId: draggedColumnId, originalIndex: -1 };
      }

      const draggedIndex = columns.findIndex(col => col.id === dragInfo.columnId);
      
      if (draggedIndex === -1 || draggedIndex === targetIndex) {
        resetDragState();
        return;
      }

      // Create new column order
      const newColumns = [...columns];
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      
      // Adjust target index if dragging from left to right
      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      newColumns.splice(adjustedTargetIndex, 0, draggedColumn);

      onReorderColumns(newColumns);
    } catch (error) {
      console.warn('Column drop failed:', error);
    } finally {
      // Always reset state after drop attempt
      resetDragState();
    }
  }, [draggedColumnId, columns, onReorderColumns, resetDragState]);

  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  const isDragging = (columnId: string) => draggedColumnId === columnId && isDragActiveRef.current;

  return {
    draggedColumnId,
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