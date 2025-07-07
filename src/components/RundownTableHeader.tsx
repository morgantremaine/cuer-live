
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderColumns) {
      const oldIndex = visibleColumns.findIndex((column) => column.id === active.id);
      const newIndex = visibleColumns.findIndex((column) => column.id === over?.id);

      const newColumns = arrayMove(visibleColumns, oldIndex, newIndex);
      onReorderColumns(newColumns);
    }
  };

  return (
    <thead className="bg-blue-600 dark:bg-blue-700 sticky top-0 z-20">
      <tr>
        {/* Row number column - static, not draggable */}
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
        
        {/* Draggable columns */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext 
            items={visibleColumns.map(col => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            {visibleColumns.map((column, index) => {
              const columnWidth = getColumnWidth(column);
              
              return (
                <ResizableColumnHeader
                  key={column.id}
                  column={column}
                  width={columnWidth}
                  onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                  showLeftSeparator={index > 0}
                >
                  {column.name || column.key}
                </ResizableColumnHeader>
              );
            })}
          </SortableContext>
        </DndContext>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
