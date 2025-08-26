import React, { useState, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SimpleResizableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  isDark?: boolean;
  columnExpandState: { [key: string]: boolean };
  toggleColumnExpand: (key: string) => void;
}

// Define minimum widths for different column types
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 95;
    case 'segmentName':
      return 100;
    case 'talent':
      return 60;
    case 'script':
    case 'notes':
      return 120;
    case 'gfx':
    case 'video':
      return 80;
    default:
      return 50;
  }
};

export const SimpleResizableColumnHeader: React.FC<SimpleResizableColumnHeaderProps> = ({
  column,
  width,
  onWidthChange,
  isDark = false,
  columnExpandState,
  toggleColumnExpand
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start resizing if clicking on the resize handle
    if (!(e.target as Element).classList.contains('resize-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(parseInt(width.replace('px', '')));
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(getMinimumWidth(column), startWidth + deltaX);
    
    onWidthChange(column.id, newWidth);
  }, [isResizing, startX, startWidth, column, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isResizing]);

  // Add event listeners for mouse move and up
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Create drag listeners that exclude the resize handle
  const dragListeners = {
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      // Don't start dragging if clicking on resize handle
      if ((e.target as Element).classList.contains('resize-handle')) {
        return;
      }
      listeners?.onMouseDown?.(e);
    }
  };

  return (
    <th
      ref={setNodeRef}
      style={{ ...style, width, minWidth: width, maxWidth: width }}
      className={`relative px-2 py-1 text-left text-xs font-medium uppercase tracking-wider border-b border-r print:border-gray-400 cursor-grab active:cursor-grabbing ${
        isDark 
          ? 'text-gray-300 border-gray-600 bg-gray-800' 
          : 'text-gray-500 border-gray-200 bg-gray-50'
      } ${
        ['duration', 'startTime', 'endTime', 'elapsedTime'].includes(column.key) 
          ? 'print-time-column' 
          : 'print-content-column'
      }`}
      {...attributes}
      {...dragListeners}
    >
      <div className="flex items-center space-x-1">
        {(column.key === 'script' || column.key === 'notes') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleColumnExpand(column.key);
            }}
            className={`flex-shrink-0 p-0.5 rounded transition-colors print:hidden ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                : 'hover:bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
            title={columnExpandState[column.key] ? 'Collapse all' : 'Expand all'}
          >
            {columnExpandState[column.key] ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <span className="truncate">
          {column.name}
        </span>
      </div>
      
      {/* Resize handle */}
      <div
        className={`resize-handle absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:opacity-75 ${
          isResizing ? 'bg-blue-500 opacity-75' : 'bg-transparent'
        }`}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};