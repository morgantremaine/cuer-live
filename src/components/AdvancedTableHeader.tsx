import React, { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { Column } from '@/hooks/useColumnsManager';

interface AdvancedTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
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

interface SortableColumnHeaderProps {
  column: Column;
  width: string;
  onWidthChange: (columnId: string, width: number) => void;
  children: React.ReactNode;
}

const SortableColumnHeader = ({ 
  column, 
  width, 
  onWidthChange, 
  children 
}: SortableColumnHeaderProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  
  const headerRef = useRef<HTMLTableHeaderCellElement>(null);
  const isResizingRef = useRef<boolean>(false);
  const initialWidthRef = useRef<number>(0);

  const minimumWidth = getMinimumWidth(column);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!headerRef.current) return;
    
    isResizingRef.current = true;
    
    const startX = e.clientX;
    const startWidth = parseInt(width.replace('px', ''));
    initialWidthRef.current = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const deltaX = e.clientX - startX;
      const calculatedWidth = initialWidthRef.current + deltaX;
      const newWidth = Math.max(minimumWidth, calculatedWidth);
      
      onWidthChange(column.id, newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, onWidthChange, width, minimumWidth]);

  // Create listeners that exclude the resize handle
  const dragListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      if (isResizingRef.current || 
          (e.target as HTMLElement).classList.contains('resize-handle') ||
          (e.target as HTMLElement).closest('.resize-handle')) {
        return;
      }
      listeners?.onPointerDown?.(e);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // CRITICAL: Use the exact width from getColumnWidth (includes expansion)
    width: width,
    minWidth: `${minimumWidth}px`,
    // NO maxWidth constraint - let it expand as calculated
    borderRight: '1px solid hsl(var(--border))',
    zIndex: isDragging ? 1000 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <th 
      ref={(node) => {
        setNodeRef(node);
        headerRef.current = node;
      }}
      className={`px-2 py-1 text-left text-sm font-semibold text-white relative select-none bg-blue-600 ${
        isDragging ? 'opacity-50' : ''
      } cursor-move`}
      style={style}
      {...attributes}
      {...dragListeners}
    >
      <div className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none">
        {children}
      </div>
      
      {/* Resize handle */}
      <div 
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10 pointer-events-auto"
        onMouseDown={handleMouseDown}
      />
    </th>
  );
};

const AdvancedTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns
}: AdvancedTableHeaderProps) => {
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const column = visibleColumns.find(col => col.id === event.active.id);
    setActiveColumn(column || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && onReorderColumns) {
      const oldIndex = visibleColumns.findIndex(col => col.id === active.id);
      const newIndex = visibleColumns.findIndex(col => col.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newColumns = arrayMove(visibleColumns, oldIndex, newIndex);
        onReorderColumns(newColumns);
      }
    }
    
    setActiveColumn(null);
  };

  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-blue-600 text-white">
        {/* Row number column */}
        <th 
          className="px-2 py-1 text-left text-sm font-semibold text-white"
          style={{ 
            width: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          #
        </th>
        
        {/* Draggable columns with resize */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext 
            items={visibleColumns.map(col => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            {visibleColumns.map((column) => {
              const columnWidth = getColumnWidth(column);
              
              return (
                <SortableColumnHeader
                  key={column.id}
                  column={column}
                  width={columnWidth}
                  onWidthChange={updateColumnWidth}
                >
                  {column.name || column.key}
                </SortableColumnHeader>
              );
            })}
          </SortableContext>
          
          <DragOverlay>
            {activeColumn ? (
              <th 
                className="px-2 py-1 text-left text-sm font-semibold text-white bg-blue-600 border-r border-border"
                style={{ 
                  width: getColumnWidth(activeColumn),
                  opacity: 0.9
                }}
              >
                <div className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                  {activeColumn.name || activeColumn.key}
                </div>
              </th>
            ) : null}
          </DragOverlay>
        </DndContext>
      </tr>
    </thead>
  );
};

export default AdvancedTableHeader;