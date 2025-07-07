import React, { useState, useCallback } from 'react';
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

interface GridBasedHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
  gridTemplateColumns: string;
}

interface SortableHeaderCellProps {
  column: Column;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  index: number;
}

const SortableHeaderCell = ({ column, getColumnWidth, updateColumnWidth, index }: SortableHeaderCellProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const handleResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = parseInt(getColumnWidth(column).replace('px', ''));
    const minimumWidth = 50;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(minimumWidth, startWidth + deltaX);
      updateColumnWidth(column.id, newWidth);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column, getColumnWidth, updateColumnWidth]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-blue-600 text-white px-2 py-1 text-left text-sm font-semibold border-r border-border relative cursor-move ${
        isDragging ? 'z-50' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="truncate pr-2 pointer-events-none">
        {column.name || column.key}
      </div>
      
      {/* Resize handle */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10 pointer-events-auto"
        onMouseDown={handleResize}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const GridBasedHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
  gridTemplateColumns
}: GridBasedHeaderProps) => {
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
    <>
      {/* Row number header */}
      <div className="bg-blue-600 text-white px-2 py-1 text-left text-sm font-semibold border-r border-border sticky top-0 z-10">
        #
      </div>
      
      {/* Column headers with DND */}
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
          {visibleColumns.map((column, index) => (
            <SortableHeaderCell
              key={column.id}
              column={column}
              getColumnWidth={getColumnWidth}
              updateColumnWidth={updateColumnWidth}
              index={index}
            />
          ))}
        </SortableContext>
        
        <DragOverlay>
          {activeColumn ? (
            <div className="bg-blue-600 text-white px-2 py-1 text-left text-sm font-semibold border-r border-border opacity-90">
              <div className="truncate pr-2">
                {activeColumn.name || activeColumn.key}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default GridBasedHeader;