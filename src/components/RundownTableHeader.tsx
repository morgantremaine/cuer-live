
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
import HeaderContextMenu from './HeaderContextMenu';
import { Column } from '@/types/columns';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  allColumns?: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
  onToggleColumnVisibility?: (columnId: string, insertIndex?: number) => void;
  items?: any[]; // For auto-sizing columns
  columnExpandState?: { [columnKey: string]: boolean };
  onToggleColumnExpand?: (columnKey: string) => void;
  onToggleAllHeaders?: () => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
  savedLayouts?: any[];
  onLoadLayout?: (columns: Column[]) => void;
  zoomLevel?: number;
}

const RundownTableHeader = ({
  visibleColumns,
  allColumns = [],
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
  onToggleColumnVisibility,
  items = [],
  columnExpandState = {},
  onToggleColumnExpand,
  onToggleAllHeaders,
  isHeaderCollapsed,
  savedLayouts,
  onLoadLayout,
  zoomLevel = 1
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

      // FIXED: Reorder within ALL columns while preserving visibility state
      console.log('🔄 Column reorder debug:', {
        totalColumns: allColumns.length,
        visibleColumns: visibleColumns.length,
        hiddenColumns: allColumns.filter(c => c.isVisible === false).length,
        draggedColumn: active.id,
        targetColumn: over?.id
      });

      // Reorder only the visible columns
      const reorderedVisibleColumns = arrayMove(visibleColumns, oldIndex, newIndex);
      
      // Now we need to reconstruct the full column list preserving hidden columns
      // Strategy: Map each position in allColumns to either a reordered visible column or the original hidden column
      
      const visibleColumnMap = new Map(reorderedVisibleColumns.map((col, index) => [col.id, index]));
      const originalVisibleColumnMap = new Map(visibleColumns.map(col => [col.id, col]));
      
      let visibleColumnInsertIndex = 0;
      
      const finalColumns = allColumns.map(originalCol => {
        // If this was a visible column, replace it with its reordered version
        if (originalVisibleColumnMap.has(originalCol.id)) {
          const reorderedColumn = reorderedVisibleColumns[visibleColumnInsertIndex++];
          return reorderedColumn;
        }
        // Keep hidden columns in their original positions
        return originalCol;
      });
      
      console.log('🔄 Reorder result:', {
        before: allColumns.map(c => `${c.name}(${c.isVisible !== false ? 'V' : 'H'})`),
        after: finalColumns.map(c => `${c.name}(${c.isVisible !== false ? 'V' : 'H'})`)
      });

      onReorderColumns(finalColumns);
    }
    
    setActiveColumn(null);
  };

  // Helper to measure badge widths for talent column
  const measureBadgeWidth = (text: string, measureElement: HTMLDivElement): number => {
    // Check if text contains bracket formatting
    const badgeMatches = text.match(/\[([^\[\]{}]+)(?:\{[^}]+\})?\]/g);
    
    if (!badgeMatches) {
      // No badges, measure plain text
      measureElement.textContent = text;
      return measureElement.offsetWidth;
    }
    
    // Extract badge contents and measure each badge with proper spacing
    let totalWidth = 0;
    
    badgeMatches.forEach((badge, index) => {
      // Extract just the text content from [text]{color} or [text]
      const content = badge.replace(/\[([^\[\]{}]+)(?:\{[^}]+\})?\]/, '$1');
      measureElement.textContent = content;
      const textWidth = measureElement.offsetWidth;
      
      // Add badge padding (px-1.5 = 6px each side = 12px), no margin since gap handles spacing
      const badgeWidth = textWidth + 12;
      totalWidth += badgeWidth;
      
      // Add gap between badges (gap-0.5 = 2px)
      if (index < badgeMatches.length - 1) {
        totalWidth += 2;
      }
    });
    
    return totalWidth;
  };

  // Auto-resize column to fit content
  const handleAutoResize = (column: Column) => {
    if (!items.length) return;
    
    // Disable auto-resize for script and notes columns as they have expandable cells
    if (column.key === 'script' || column.key === 'notes') return;

    // Special handling for images column
    if (column.key === 'images' || column.id === 'images') {
      // For images column, set a minimum width for preview cards to display properly
      const minImageColumnWidth = 120; // Minimum width for cards to not overflow
      updateColumnWidth(column.id, minImageColumnWidth);
      return;
    }

    // Create a temporary element to measure text width with EXACT TextAreaCell styling
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.fontSize = '14px'; // text-sm
    measureElement.style.fontFamily = 'inherit';
    measureElement.style.fontWeight = '400';
    measureElement.style.padding = '8px 12px'; // px-3 py-2 from TextAreaCell
    measureElement.style.lineHeight = '1.3'; // exact match to TextAreaCell
    measureElement.style.border = 'none';
    measureElement.style.margin = '0';
    measureElement.style.width = 'max-content'; // Allow natural sizing
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
        
        // Handle multi-line text by measuring each line and finding the longest
        let maxLineWidth = 0;
        
        // Special handling for talent column with badge formatting
        if (column.key === 'talent') {
          maxLineWidth = measureBadgeWidth(textValue, measureElement);
        } else {
          const lines = textValue.split('\n');
          
          // If there are no explicit line breaks (single line), measure the entire text
          // to prevent unnecessary wrapping during auto-resize
          if (lines.length === 1) {
            measureElement.style.whiteSpace = 'nowrap'; // Prevent wrapping for single line
            measureElement.textContent = textValue;
            maxLineWidth = measureElement.offsetWidth;
          } else {
            // For multi-line text with explicit line breaks, measure each line
            measureElement.style.whiteSpace = 'nowrap'; // Prevent wrapping when measuring individual lines
            lines.forEach(line => {
              measureElement.textContent = line.trim();
              const lineWidth = measureElement.offsetWidth;
              maxLineWidth = Math.max(maxLineWidth, lineWidth);
            });
          }
        }
        
        // Cap the width to prevent excessively wide columns, but allow more space for longer text
        const cappedWidth = Math.min(maxLineWidth, 500); // Increased from 300px to 500px for longer text
        maxWidth = Math.max(maxWidth, cappedWidth);
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
          className="p-0 text-center text-sm font-semibold text-white bg-blue-600"
          style={{ 
            width: `${64 * zoomLevel}px`, 
            minWidth: `${64 * zoomLevel}px`,
            maxWidth: `${64 * zoomLevel}px`,
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            {onToggleAllHeaders && isHeaderCollapsed && items.some(item => item.type === 'header') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAllHeaders();
                }}
                className="p-0.5 hover:bg-blue-500 rounded transition-colors"
                title="Toggle all header groups"
              >
                {items.filter(item => item.type === 'header').some(header => isHeaderCollapsed(header.id)) ? (
                  <ChevronRight className="h-3 w-3 text-white" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-white" />
                )}
              </button>
            )}
          </div>
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
              
              const headerContent = (
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
              );

              return (
                <ResizableColumnHeader
                  key={column.id}
                  column={column}
                  width={columnWidth}
                  onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                  onAutoResize={() => handleAutoResize(column)}
                  showLeftSeparator={index > 0}
                  isLastColumn={isLastColumn}
                  zoomLevel={zoomLevel}
                >
                   {onToggleColumnVisibility && allColumns.length > 0 ? (
                     <HeaderContextMenu
                       column={column}
                       allColumns={allColumns}
                       visibleColumns={visibleColumns}
                       columnIndex={index}
                       onToggleColumnVisibility={onToggleColumnVisibility}
                       savedLayouts={savedLayouts}
                       onLoadLayout={onLoadLayout}
                     >
                       {headerContent}
                     </HeaderContextMenu>
                   ) : (
                     headerContent
                   )}
                </ResizableColumnHeader>
              );
            })}
          </SortableContext>
          
          {/* Only show DragOverlay when not zoomed to prevent positioning issues */}
          {zoomLevel === 1 && (
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
                      width: `${parseFloat(getColumnWidth(activeColumn)) - 16}px`,
                      minWidth: `${parseFloat(getColumnWidth(activeColumn)) - 16}px`,
                      maxWidth: `${parseFloat(getColumnWidth(activeColumn)) - 16}px`
                    }}
                  >
                    {activeColumn.name || activeColumn.key}
                  </div>
                </th>
              ) : null}
            </DragOverlay>
          )}
        </DndContext>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
