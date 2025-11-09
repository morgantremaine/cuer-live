
import React, { useState, useCallback, useEffect } from 'react';
import OptimizedRundownTableWrapper from './OptimizedRundownTableWrapper';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import { getMinimumWidth } from '@/utils/columnSizing';
import { useLocalExpandedCells } from '@/hooks/useLocalExpandedCells';

interface RundownContentProps {
  rundownId: string;
  title?: string;
  totalRuntime?: string;
  items: RundownItem[];
  visibleColumns: Column[];
  allColumns?: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  selectedRowId?: string | null;
  isPlaying?: boolean;
  autoScrollEnabled?: boolean;
  startTime?: string;
  onToggleAutoScroll?: () => void;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
  onToggleColumnVisibility?: (columnId: string, insertIndex?: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (itemId: string) => void;
  onMoveItemUp?: (index: number) => void;
  onMoveItemDown?: (index: number) => void;
  markActiveTyping?: () => void;
  // Header collapse functions
  toggleHeaderCollapse: (headerId: string) => void;
  isHeaderCollapsed: (headerId: string) => boolean;
  getHeaderGroupItemIds: (headerId: string) => string[];
  visibleItems: RundownItem[];
  savedLayouts?: any[];
  onLoadLayout?: (columns: Column[]) => void;
  // Zoom functionality
  zoomLevel?: number;
  // @dnd-kit integration
  DndContext?: React.ComponentType<any>;
  SortableContext?: React.ComponentType<any>;
  sensors?: any;
  sortableItems?: any[];
  dndKitDragStart?: (event: any) => void;
  dndKitDragEnd?: (event: any) => void;
  modifiers?: any[];
  collisionDetection?: any;
  activeId?: any;
  resetDragState?: () => void;
}

const RundownContent = React.memo<RundownContentProps>(({
  rundownId,
  items,
  visibleColumns,
  allColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData = false,
  selectedRowId = null,
  isPlaying = false,
  autoScrollEnabled = false,
  startTime = '00:00:00',
  title = 'Untitled Rundown',
  totalRuntime = '00:00:00',
  onToggleAutoScroll,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
  onToggleColumnVisibility,
  getRowNumber,
  getRowStatus,
  calculateHeaderDuration,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onToggleFloat,
  onRowSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  onMoveItemUp,
  onMoveItemDown,
  markActiveTyping,
  // Header collapse functions
  toggleHeaderCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds,
  visibleItems,
  savedLayouts,
  onLoadLayout,
  zoomLevel = 1.0,
  // @dnd-kit integration
  DndContext,
  SortableContext,
  sensors,
  sortableItems,
  dndKitDragStart,
  dndKitDragEnd,
  modifiers,
  collisionDetection,
  activeId,
  resetDragState
}) => {
  // Column expand state for script and notes columns
  const [columnExpandState, setColumnExpandState] = useState<{ [columnKey: string]: boolean }>({});

  // Use localStorage for expanded cells
  const { expandedCells, updateExpandedCells } = useLocalExpandedCells(rundownId);
  
  // Toggle individual cell expand state
  const toggleCellExpanded = useCallback((itemId: string, columnKey: string) => {
    const cellKey = `${itemId}-${columnKey}`;
    const newSet = new Set(expandedCells);
    if (newSet.has(cellKey)) {
      newSet.delete(cellKey);
    } else {
      newSet.add(cellKey);
    }
    updateExpandedCells(newSet);
  }, [expandedCells, updateExpandedCells]);

  // Toggle column expand state
  const handleToggleColumnExpand = useCallback((columnKey: string) => {
    const newState = !columnExpandState[columnKey];
    setColumnExpandState(prev => ({
      ...prev,
      [columnKey]: newState
    }));
    
    // Apply to all items in the column
    const newSet = new Set(expandedCells);
    items.forEach(item => {
      const cellKey = `${item.id}-${columnKey}`;
      if (newState) {
        newSet.add(cellKey);      // Expand all cells in this column
      } else {
        newSet.delete(cellKey);   // Collapse all cells in this column
      }
    });
    
    // Persist to localStorage
    updateExpandedCells(newSet);
  }, [columnExpandState, expandedCells, items, updateExpandedCells]);

  // Toggle all header groups expand/collapse state
  const handleToggleAllHeaders = useCallback(() => {
    // Find all headers in the items
    const headerItems = items.filter(item => item.type === 'header');
    
    if (headerItems.length === 0) return;
    
    // Check if any headers are currently collapsed
    const hasCollapsedHeaders = headerItems.some(header => isHeaderCollapsed(header.id));
    
    // If any headers are collapsed, expand all. If all are expanded, collapse all.
    headerItems.forEach(header => {
      const isCurrentlyCollapsed = isHeaderCollapsed(header.id);
      
      if (hasCollapsedHeaders && isCurrentlyCollapsed) {
        // Expand this collapsed header
        toggleHeaderCollapse(header.id);
      } else if (!hasCollapsedHeaders && !isCurrentlyCollapsed) {
        // Collapse this expanded header
        toggleHeaderCollapse(header.id);
      }
    });
  }, [items, isHeaderCollapsed, toggleHeaderCollapse]);

  // Initialize autoscroll functionality
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items
  });

  // Initialize drag auto-scroll functionality
  const isDragging = draggedItemIndex !== null;
  const { handleDragAutoScroll } = useDragAutoScroll({
    scrollContainerRef,
    isActive: isDragging
  });

  // Enhanced drag over handler that includes auto-scroll
  const handleEnhancedDragOver = React.useCallback((e: React.DragEvent, index?: number) => {
    // Only handle auto-scroll for row dragging, not column dragging
    // Check if this is a column drag by looking for @dnd-kit data attributes
    const target = e.target as HTMLElement;
    const isColumnDrag = target.closest('[data-sortable-item]') || 
                        target.closest('.dnd-context') ||
                        e.dataTransfer?.types.includes('application/x-dnd-kit-sortable');
    
    if (!isColumnDrag && isDragging) {
      handleDragAutoScroll(e);
    }
    
    // Then handle regular drag over logic
    onDragOver(e, index);
  }, [handleDragAutoScroll, onDragOver, isDragging]);

  // Add browser event coordination for drag reliability
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && resetDragState) {
        console.log('🎯 Tab switched during drag - cancelling drag operation');
        resetDragState();
      }
    };

    const handleWindowBlur = () => {
      if (resetDragState && (draggedItemIndex !== null || isDragging)) {
        console.log('🎯 Window lost focus during drag - cancelling drag operation');
        resetDragState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [resetDragState, draggedItemIndex, isDragging]);

  // Calculate total table width to ensure proper sizing
  const totalTableWidth = React.useMemo(() => {
    let total = 64; // Row number column width
    visibleColumns.forEach(column => {
      const width = getColumnWidth(column);
      const widthValue = parseFloat(width.replace('px', ''));
      const normalized = Math.max(isNaN(widthValue) ? 0 : widthValue, getMinimumWidth(column));
      total += normalized;
    });
    return total;
  }, [visibleColumns, getColumnWidth]);

  // Dev-only width verification with zoom-specific debugging
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const checkTableAlignment = () => {
        const headerTable = document.querySelector('[data-rundown-table="header"]') as HTMLTableElement;
        const bodyTable = document.querySelector('[data-rundown-table="body"]') as HTMLTableElement;
        
        if (headerTable && bodyTable) {
          const headerWidth = headerTable.scrollWidth;
          const bodyWidth = bodyTable.scrollWidth;
          const calculatedWidth = totalTableWidth * zoomLevel;
          
          const headerDelta = Math.abs(headerWidth - calculatedWidth);
          const bodyDelta = Math.abs(bodyWidth - calculatedWidth);
          
          // Log all width info for zoom-specific debugging
          console.log('Width Debug:', {
            zoomLevel,
            totalTableWidth,
            calculatedWidth,
            headerWidth,
            bodyWidth,
            headerDelta,
            bodyDelta,
            columnWidths: visibleColumns.map(col => ({
              id: col.id,
              key: col.key,
              width: getColumnWidth(col),
              scaledWidth: `${parseFloat(getColumnWidth(col).replace('px', '')) * zoomLevel}px`
            }))
          });
          
          if (headerDelta > 2 || bodyDelta > 2) {
            console.warn('🚨 Table alignment discrepancy detected:', {
              calculatedWidth,
              headerWidth,
              bodyWidth,
              headerDelta,
              bodyDelta,
              zoomLevel,
              visibleColumns: visibleColumns.map(col => ({ id: col.id, width: getColumnWidth(col) }))
            });
          }
        }
      };
      
      const timeoutId = setTimeout(checkTableAlignment, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [totalTableWidth, zoomLevel, visibleColumns, getColumnWidth]);

  return (
    <div className="bg-background h-full rundown-container" data-rundown-table="true">
      {/* Print-only header */}
      <div className="print:block hidden print-rundown-header">
        <div className="print-rundown-title">
          {title}
        </div>
        <div className="print-rundown-info">
          <span>Start Time: {startTime}</span>
          <span>Total Runtime: {totalRuntime}</span>
        </div>
      </div>
      
      {/* Scrollable Content with Separate Header and Body */}
      <ScrollArea className="w-full h-full bg-background print:hidden" ref={scrollContainerRef} data-rundown-table="true">
        <div className="relative">
          {/* Sticky Header - Outside of Transform */}
          <div 
            className="sticky top-0 z-20 bg-background"
            style={{ 
              width: `${totalTableWidth * zoomLevel}px`,
              minWidth: `${totalTableWidth * zoomLevel}px`
            }}
          >
            <table 
              className="border-collapse table-container" 
              style={{ 
                tableLayout: 'fixed', 
                width: `${totalTableWidth * zoomLevel}px`,
                minWidth: `${totalTableWidth * zoomLevel}px`,
                margin: 0,
                padding: 0,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                willChange: 'transform'
              }}
              data-rundown-table="header"
            >
              <RundownTableHeader 
                visibleColumns={visibleColumns}
                allColumns={allColumns}
                getColumnWidth={(column) => `${parseFloat(getColumnWidth(column).replace('px', '')) * zoomLevel}px`}
                updateColumnWidth={(columnId, width) => updateColumnWidth(columnId, width / zoomLevel)}
                onReorderColumns={onReorderColumns}
                onToggleColumnVisibility={onToggleColumnVisibility}
                items={items}
                columnExpandState={columnExpandState}
                onToggleColumnExpand={handleToggleColumnExpand}
                onToggleAllHeaders={handleToggleAllHeaders}
                isHeaderCollapsed={isHeaderCollapsed}
                savedLayouts={savedLayouts}
                onLoadLayout={onLoadLayout}
                zoomLevel={zoomLevel}
              />
            </table>
          </div>
          
          {/* Scaled Table Body */}
          <div 
            className="bg-background zoom-container" 
            style={{ 
              minWidth: `${totalTableWidth}px`,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : '100%'
            }}
          >
            <table 
              className="border-collapse table-container" 
              style={{ 
                tableLayout: 'fixed', 
                width: `${totalTableWidth}px`,
                minWidth: `${totalTableWidth}px`,
                margin: 0,
                padding: 0,
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                willChange: 'transform'
              }}
              data-rundown-table="body"
            >
              {/* Table Body - Content with @dnd-kit wrapper */}
              {DndContext && SortableContext ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={collisionDetection}
                  onDragStart={dndKitDragStart}
                  onDragEnd={dndKitDragEnd}
                  modifiers={modifiers}
                >
                  <SortableContext items={sortableItems || []} strategy={undefined}>
                    <OptimizedRundownTableWrapper
              items={items} // Pass original items for duration calculations
              visibleItems={visibleItems} // Pass visible items for display
              visibleColumns={visibleColumns}
              currentTime={currentTime}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              selectedRows={selectedRows}
              draggedItemIndex={draggedItemIndex}
              isDraggingMultiple={isDraggingMultiple}
              dropTargetIndex={dropTargetIndex}
              currentSegmentId={currentSegmentId}
              hasClipboardData={hasClipboardData}
              selectedRowId={selectedRowId}
              startTime={startTime}
              columnExpandState={columnExpandState}
              expandedCells={expandedCells}
              onToggleCellExpanded={toggleCellExpanded}
              getColumnWidth={getColumnWidth}
              updateColumnWidth={updateColumnWidth}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              onToggleColorPicker={onToggleColorPicker}
              onColorSelect={onColorSelect}
              onDeleteRow={onDeleteRow}
              onToggleFloat={onToggleFloat}
              onRowSelect={onRowSelect}
              onDragStart={onDragStart}
              onDragOver={handleEnhancedDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onCopySelectedRows={onCopySelectedRows}
              onDeleteSelectedRows={onDeleteSelectedRows}
              onPasteRows={onPasteRows || (() => {})}
              onClearSelection={onClearSelection || (() => {})}
              onAddRow={onAddRow || (() => {})}
              onAddHeader={onAddHeader || (() => {})}
              onJumpToHere={onJumpToHere}
              onMoveItemUp={onMoveItemUp}
              onMoveItemDown={onMoveItemDown}
              markActiveTyping={markActiveTyping}
              // Header collapse functions
              toggleHeaderCollapse={toggleHeaderCollapse}
              isHeaderCollapsed={isHeaderCollapsed}
              getHeaderGroupItemIds={getHeaderGroupItemIds}
              />
                  </SortableContext>
                </DndContext>
              ) : (
                <OptimizedRundownTableWrapper
              items={items} // Pass original items for duration calculations
              visibleItems={visibleItems} // Pass visible items for display
              visibleColumns={visibleColumns}
              currentTime={currentTime}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              selectedRows={selectedRows}
              draggedItemIndex={draggedItemIndex}
              isDraggingMultiple={isDraggingMultiple}
              dropTargetIndex={dropTargetIndex}
              currentSegmentId={currentSegmentId}
              hasClipboardData={hasClipboardData}
              selectedRowId={selectedRowId}
              startTime={startTime}
              columnExpandState={columnExpandState}
              expandedCells={expandedCells}
              onToggleCellExpanded={toggleCellExpanded}
              getColumnWidth={getColumnWidth}
              updateColumnWidth={updateColumnWidth}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              onToggleColorPicker={onToggleColorPicker}
              onColorSelect={onColorSelect}
              onDeleteRow={onDeleteRow}
              onToggleFloat={onToggleFloat}
              onRowSelect={onRowSelect}
              onDragStart={onDragStart}
              onDragOver={handleEnhancedDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onCopySelectedRows={onCopySelectedRows}
              onDeleteSelectedRows={onDeleteSelectedRows}
              onPasteRows={onPasteRows || (() => {})}
              onClearSelection={onClearSelection || (() => {})}
              onAddRow={onAddRow || (() => {})}
              onAddHeader={onAddHeader || (() => {})}
              onJumpToHere={onJumpToHere}
              onMoveItemUp={onMoveItemUp}
              onMoveItemDown={onMoveItemDown}
              markActiveTyping={markActiveTyping}
              // Header collapse functions
              toggleHeaderCollapse={toggleHeaderCollapse}
              isHeaderCollapsed={isHeaderCollapsed}
              getHeaderGroupItemIds={getHeaderGroupItemIds}
              />
              )}
            </table>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});

RundownContent.displayName = 'RundownContent';

export default RundownContent;
