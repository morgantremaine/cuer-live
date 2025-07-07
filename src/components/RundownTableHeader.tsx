
import React, { useState, useCallback } from 'react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns
}: RundownTableHeaderProps) => {
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleColumnDragStart = useCallback((e: React.DragEvent, column: Column, index: number) => {
    // Ensure we're not resizing when starting drag
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
      e.preventDefault();
      return;
    }
    
    // Clean up any existing drag state first
    setDropTargetIndex(null);
    
    // Set drag state with a small delay to ensure clean state
    requestAnimationFrame(() => {
      setDraggedColumnId(column.id);
    });
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', column.id);
    
    // Simplified drag image - avoid potential issues with complex positioning
    try {
      const dragElement = e.currentTarget as HTMLElement;
      if (dragElement) {
        // Use simpler positioning to avoid coordinate issues
        e.dataTransfer.setDragImage(dragElement, 10, 10);
      }
    } catch (error) {
      // Silently fall back to default behavior
    }
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedColumnId || e.dataTransfer.types.includes('text/plain')) {
      setDropTargetIndex(targetIndex);
    }
  }, [draggedColumnId]);

  const handleColumnDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the header row entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTargetIndex(null);
    }
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = draggedColumnId || e.dataTransfer.getData('text/plain');
    
    if (!draggedId || !onReorderColumns) {
      setDraggedColumnId(null);
      setDropTargetIndex(null);
      return;
    }

    const draggedIndex = visibleColumns.findIndex(col => col.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedColumnId(null);
      setDropTargetIndex(null);
      return;
    }

    // Use requestAnimationFrame to ensure clean state updates
    requestAnimationFrame(() => {
      // Create new column order
      const newColumns = [...visibleColumns];
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      
      // Adjust target index if dragging from left to right
      const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      newColumns.splice(adjustedTargetIndex, 0, draggedColumn);

      onReorderColumns(newColumns);
      
      // Clean up state
      setDraggedColumnId(null);
      setDropTargetIndex(null);
    });
  }, [draggedColumnId, visibleColumns, onReorderColumns]);

  const handleColumnDragEnd = useCallback(() => {
    // Use a small delay to ensure all other events have processed
    setTimeout(() => {
      setDraggedColumnId(null);
      setDropTargetIndex(null);
    }, 50);
  }, []);

  return (
    <thead className="bg-blue-600 dark:bg-blue-700">
      <tr>
        {/* Row number column - matches the structure in RundownTable exactly */}
        <th 
          className="px-2 py-1 text-left text-sm font-semibold text-white bg-blue-600"
          style={{ 
            width: '64px', 
            minWidth: '64px',
            maxWidth: '64px',
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          #
        </th>
        {/* Dynamic columns */}
        {visibleColumns.map((column, index) => {
          const columnWidth = getColumnWidth(column);
          const isDragging = draggedColumnId === column.id;
          
          return (
            <React.Fragment key={column.id}>
              {/* Drop indicator before column */}
              {dropTargetIndex === index && (
                <th className="p-0 bg-blue-600 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-300 z-10" />
                </th>
              )}
              
              <ResizableColumnHeader
                column={column}
                width={columnWidth}
                onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                showLeftSeparator={index > 0}
                isDragging={isDragging}
                onDragStart={(e) => handleColumnDragStart(e, column, index)}
                onDragOver={(e) => handleColumnDragOver(e, index)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, index)}
                onDragEnd={handleColumnDragEnd}
              >
                {column.name || column.key}
              </ResizableColumnHeader>
              
              {/* Drop indicator after last column */}
              {dropTargetIndex === visibleColumns.length && index === visibleColumns.length - 1 && (
                <th className="p-0 bg-blue-600 relative">
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-300 z-10" />
                </th>
              )}
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
