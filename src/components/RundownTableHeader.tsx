
import React, { useState } from 'react';
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
  items?: any[]; // For auto-sizing columns
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
  items = []
}: RundownTableHeaderProps) => {
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  
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

  const handleDragStart = (event: DragStartEvent) => {
    const column = visibleColumns.find(col => col.id === event.active.id);
    setActiveColumn(column || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderColumns) {
      const oldIndex = visibleColumns.findIndex((column) => column.id === active.id);
      const newIndex = visibleColumns.findIndex((column) => column.id === over?.id);

      const newColumns = arrayMove(visibleColumns, oldIndex, newIndex);
      onReorderColumns(newColumns);
    }
    
    setActiveColumn(null);
  };

  // Auto-resize column to fit content
  const handleAutoResize = (column: Column) => {
    if (!items.length) return;
    
    // Disable auto-resize for script and notes columns as they have expandable cells
    if (column.key === 'script' || column.key === 'notes') return;

    // Create a temporary element to measure text width
    const measureElement = document.createElement('span');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontSize = '14px'; // Match table font size
    measureElement.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif'; // Match table font family
    measureElement.style.fontWeight = '400'; // Normal font weight for cell content
    measureElement.style.padding = '4px 8px'; // Match cell padding
    measureElement.style.border = 'none';
    measureElement.style.margin = '0';
    measureElement.style.lineHeight = '1.25';
    document.body.appendChild(measureElement);

    let maxWidth = 0;

    // Measure column header text with bold font weight
    measureElement.style.fontWeight = '600'; // Bold for header
    measureElement.textContent = column.name || column.key;
    maxWidth = Math.max(maxWidth, measureElement.offsetWidth);

    // Reset to normal weight for cell content
    measureElement.style.fontWeight = '400';

    // Measure all cell content for this column
    items.forEach(item => {
      let cellValue = '';
      
      // Handle custom vs built-in columns
      if (column.isCustom) {
        cellValue = item.customFields?.[column.key] || '';
      } else {
        cellValue = item[column.key] || '';
      }
      
      const textValue = String(cellValue).trim();
      if (textValue) {
        measureElement.textContent = textValue;
        maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
      }
    });

    document.body.removeChild(measureElement);

    // Add some extra padding for resize handle, borders, and breathing room
    const padding = 40; // Extra padding for resize handle and spacing
    const calculatedWidth = Math.max(maxWidth + padding, 80); // Minimum 80px

    updateColumnWidth(column.id, calculatedWidth);
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext 
            items={visibleColumns.map(col => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            {visibleColumns.map((column, index) => {
              const columnWidth = getColumnWidth(column);
              const isLastColumn = index === visibleColumns.length - 1;
              
              return (
                <ResizableColumnHeader
                  key={column.id}
                  column={column}
                  width={columnWidth}
                  onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                  onAutoResize={() => handleAutoResize(column)}
                  showLeftSeparator={index > 0}
                  isLastColumn={isLastColumn}
                >
                  {column.name || column.key}
                </ResizableColumnHeader>
              );
            })}
          </SortableContext>
          
          <DragOverlay>
            {activeColumn ? (
              <th 
                className="px-2 py-1 text-left text-sm font-semibold text-white bg-blue-600 border-r border-border"
                style={{ 
                  width: getColumnWidth(activeColumn),
                  minWidth: getColumnWidth(activeColumn),
                  maxWidth: getColumnWidth(activeColumn),
                  opacity: 0.9,
                  zIndex: 1000
                }}
              >
                <div 
                  className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{
                    width: `${parseInt(getColumnWidth(activeColumn)) - 16}px`,
                    minWidth: `${parseInt(getColumnWidth(activeColumn)) - 16}px`,
                    maxWidth: `${parseInt(getColumnWidth(activeColumn)) - 16}px`
                  }}
                >
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

export default RundownTableHeader;
