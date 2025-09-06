
import React, { useState, useCallback, useRef, useEffect } from 'react';
import OptimizedRundownTableWrapper from './OptimizedRundownTableWrapper';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';

interface RundownContentProps {
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
}

const RundownContent = React.memo<RundownContentProps>(({
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
  markActiveTyping,
  // Header collapse functions
  toggleHeaderCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds,
  visibleItems,
  savedLayouts,
  onLoadLayout,
  zoomLevel = 1.0
}) => {
  // Column expand state for script and notes columns
  const [columnExpandState, setColumnExpandState] = useState<{ [columnKey: string]: boolean }>({});

  // Toggle column expand state
  const handleToggleColumnExpand = useCallback((columnKey: string) => {
    // Store the current scroll position and active element to preserve viewport
    const currentScrollTop = window.scrollY;
    const currentActiveElement = document.activeElement;
    
    setColumnExpandState(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));

    // Restore scroll position and focus after state updates
    requestAnimationFrame(() => {
      // Restore the scroll position
      window.scrollTo(0, currentScrollTop);
      
      // If there was an active element that's still in the DOM and focusable, restore focus
      if (currentActiveElement && 
          document.contains(currentActiveElement) && 
          currentActiveElement instanceof HTMLElement &&
          currentActiveElement.tabIndex >= 0) {
        currentActiveElement.focus();
      }
    });
  }, []);

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

  // Header scroll sync - keep header horizontally aligned with body
  const headerScrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const scrollViewport = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    const headerContainer = headerScrollRef.current;
    
    if (!scrollViewport || !headerContainer) return;
    
    const handleScroll = () => {
      headerContainer.scrollLeft = scrollViewport.scrollLeft;
    };
    
    scrollViewport.addEventListener('scroll', handleScroll);
    return () => scrollViewport.removeEventListener('scroll', handleScroll);
  }, []);


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

  // Shared minimum width map to match ResizableColumnHeader
  const getMinimumColumnWidth = React.useCallback((column: Column): number => {
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
  }, []);

  const normalizedGetColumnWidth = React.useCallback((column: Column) => {
    const raw = getColumnWidth(column);
    const rawVal = parseFloat(String(raw).replace('px', ''));
    const min = getMinimumColumnWidth(column);
    const constrained = Math.max(min, isNaN(rawVal) ? min : rawVal);
    return `${constrained}px`;
  }, [getColumnWidth, getMinimumColumnWidth]);


  // Calculate total table width to ensure proper sizing
  const totalTableWidth = React.useMemo(() => {
    let total = 66; // Row number column width (widened slightly for alignment)
    visibleColumns.forEach(column => {
      const width = normalizedGetColumnWidth(column);
      const widthValue = parseFloat(String(width).replace('px', ''));
      total += isNaN(widthValue) ? 0 : widthValue;
    });
    return total;
  }, [visibleColumns, normalizedGetColumnWidth]);

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
      
      {/* Scrollable Content with separate sticky header (unscaled) and zoomed body */}
      <ScrollArea className="w-full h-full bg-background print:hidden" ref={scrollContainerRef}>
        {/* Sticky Header Wrapper - NOT transformed to keep sticky behavior stable */}
        <div 
          className="sticky top-0 z-20 bg-background border-b border-border overflow-hidden"
          style={{ 
            width: '100%'
          }}
        >
          <div 
            ref={headerScrollRef}
            className="overflow-hidden"
            style={{ 
              width: '100%',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <div 
              className="header-zoom-wrapper"
              style={{
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
                  padding: 0
                }}
                data-rundown-table="header"
              >
                <colgroup>
                  <col style={{ width: '66px' }} />
                  {visibleColumns.map((col) => (
                    <col key={`hcol-${col.id}`} style={{ width: normalizedGetColumnWidth(col) }} />
                  ))}
                </colgroup>
                <RundownTableHeader 
                  visibleColumns={visibleColumns}
                  allColumns={allColumns}
                  getColumnWidth={(col) => normalizedGetColumnWidth(col)}
                  updateColumnWidth={updateColumnWidth}
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
          </div>
        </div>
        
        {/* Zoomed Body */}
        <div 
          className="bg-background zoom-container" 
          style={{ 
            minWidth: `${totalTableWidth}px`,
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : '100%'
          }}
        >
          {/* Main Table Body */}
          <table 
            className="border-collapse table-container" 
            style={{ 
              tableLayout: 'fixed', 
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
              margin: 0,
              padding: 0
            }}
            data-rundown-table="main"
          >
            <colgroup>
              <col style={{ width: '66px' }} />
              {visibleColumns.map((col) => (
                <col key={`bcol-${col.id}`} style={{ width: normalizedGetColumnWidth(col) }} />
              ))}
            </colgroup>
            <OptimizedRundownTableWrapper
              items={items}
              visibleItems={visibleItems}
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
              getColumnWidth={normalizedGetColumnWidth}
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
              markActiveTyping={markActiveTyping}
              // Header collapse functions
              toggleHeaderCollapse={toggleHeaderCollapse}
              isHeaderCollapsed={isHeaderCollapsed}
              getHeaderGroupItemIds={getHeaderGroupItemIds}
            />
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
});

RundownContent.displayName = 'RundownContent';

export default RundownContent;
