
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
import { ChevronDown, ChevronRight } from 'lucide-react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
  items?: any[]; // For auto-sizing columns
  columnExpandState?: { [columnKey: string]: boolean };
  onToggleColumnExpand?: (columnKey: string) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
  items = [],
  columnExpandState = {},
  onToggleColumnExpand
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

    // Special handling for images column
    if (column.key === 'images' || column.id === 'images') {
      // For images column, set a reasonable width based on typical image display
      const imageColumnWidth = 200; // Max width for images as set in the component
      updateColumnWidth(column.id, imageColumnWidth + 16); // Add padding
      return;
    }

    // Create a temporary element to measure text width with EXACT TextAreaCell styling
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontSize = '14px'; // text-sm
    measureElement.style.fontFamily = 'inherit';
    measureElement.style.fontWeight = '400';
    measureElement.style.padding = '8px 12px'; // px-3 py-2 from TextAreaCell
    measureElement.style.lineHeight = '1.3'; // exact match to TextAreaCell
    measureElement.style.border = 'none';
    measureElement.style.margin = '0';
    document.body.appendChild(measureElement);

    let maxWidth = 0;

    // Measure column header text (headers can be font-medium for segmentName)
    measureElement.style.fontWeight = '500'; // font-medium
    measureElement.textContent = column.name || column.key;
    const headerWidth = measureElement.offsetWidth;
    maxWidth = Math.max(maxWidth, headerWidth);

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
        // For duration columns, use monospace font
        if (column.key === 'duration') {
          measureElement.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        } else {
          measureElement.style.fontFamily = 'inherit';
        }
        
        measureElement.textContent = textValue;
        const contentWidth = measureElement.offsetWidth;
        maxWidth = Math.max(maxWidth, contentWidth);
      }
    });

    document.body.removeChild(measureElement);

    // The measureElement already includes padding (8px 12px), so we only need space for the resize handle
    const resizeHandleSpace = 8; // Space for the resize handle
    const calculatedWidth = Math.max(maxWidth + resizeHandleSpace, 50);

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
                  <div className="flex items-center space-x-1">
                    {(column.key === 'script' || column.key === 'notes') && onToggleColumnExpand && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleColumnExpand(column.key);
                        }}
                        className="flex-shrink-0 p-0.5 hover:bg-blue-500 rounded transition-colors"
                        title={columnExpandState[column.key] ? 'Collapse all' : 'Expand all'}
                      >
                        {columnExpandState[column.key] ? (
                          <ChevronDown className="h-3 w-3 text-white" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-white" />
                        )}
                      </button>
                    )}
                    <span>{column.name || column.key}</span>
                  </div>
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
