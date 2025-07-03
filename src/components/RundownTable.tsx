
import React from 'react';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableProps {
  items: any[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData: boolean;
  selectedRowId: string | null;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: any) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onToggleHeaderCollapse?: (headerId: string) => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
  onJumpToHere?: (segmentId: string) => void;
}

const RundownTable = ({
  items,
  visibleColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData,
  selectedRowId,
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
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
  onToggleHeaderCollapse,
  isHeaderCollapsed,
  onJumpToHere
}: RundownTableProps) => {

  // Enhanced drag over handler that calculates drop target index
  const handleRowDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e, targetIndex);
  };

  // Enhanced drop handler with better error handling
  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 RundownTable: Drop triggered at index', targetIndex);
    
    try {
      onDrop(e, targetIndex);
    } catch (error) {
      console.error('❌ RundownTable: Drop error:', error);
      onDragEnd?.(e);
    }
  };

  // Enhanced drag end handler with logging
  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 RundownTable: Drag end triggered');
    onDragEnd?.(e);
  };

  // Enhanced container drag over for end-of-list drops
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const containerBottom = rect.bottom;
    
    // If mouse is in the bottom 50px area, set drop target to end
    if (mouseY > containerBottom - 50 && items.length > 0) {
      console.log('🎯 Container drag over - setting end drop target');
      onDragOver(e, items.length);
    }
  };

  // Enhanced container drop for end-of-list drops
  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 RundownTable: Container drop triggered - dropping at end');
    onDrop(e, items.length);
  };

  return (
    <div 
      className="relative w-full bg-background"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <table className="w-full border-collapse border border-border">
        <tbody className="bg-background">
          {items.map((item, index) => {
            const rowNumber = getRowNumber(index);
            const status = getRowStatus(item);
            const headerDuration = isHeaderItem(item) ? getHeaderDuration(index) : '';
            const isMultiSelected = selectedRows.has(item.id);
            const isSingleSelected = selectedRowId === item.id;
            const isActuallySelected = isMultiSelected || isSingleSelected;
            const isDragging = draggedItemIndex === index;
            const isCurrentlyPlaying = item.id === currentSegmentId;

            return (
              <React.Fragment key={item.id}>
                {/* Drop indicator ABOVE this row */}
                {dropTargetIndex === index && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-1 bg-blue-500 w-full relative z-50 shadow-lg"></div>
                    </td>
                  </tr>
                )}
                
                <RundownRow
                  item={item}
                  index={index}
                  rowNumber={rowNumber}
                  status={status}
                  showColorPicker={showColorPicker}
                  cellRefs={cellRefs}
                  columns={visibleColumns}
                  isSelected={isActuallySelected}
                  isCurrentlyPlaying={isCurrentlyPlaying}
                  isDraggingMultiple={isDraggingMultiple}
                  selectedRowsCount={selectedRows.size}
                  selectedRows={selectedRows}
                  headerDuration={headerDuration}
                  hasClipboardData={hasClipboardData}
                  currentSegmentId={currentSegmentId}
                  isDragging={isDragging}
                  isCollapsed={isHeaderCollapsed ? isHeaderCollapsed(item.id) : false}
                  onUpdateItem={onUpdateItem}
                  onCellClick={onCellClick}
                  onKeyDown={onKeyDown}
                  onToggleColorPicker={onToggleColorPicker}
                  onColorSelect={onColorSelect}
                  onDeleteRow={onDeleteRow}
                  onToggleFloat={onToggleFloat}
                  onRowSelect={onRowSelect}
                  onDragStart={onDragStart}
                  onDragOver={(e) => handleRowDragOver(e, index)}
                  onDrop={(e) => handleRowDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onCopySelectedRows={onCopySelectedRows}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  onToggleCollapse={onToggleHeaderCollapse}
                  onPasteRows={onPasteRows}
                  onClearSelection={onClearSelection}
                  onAddRow={onAddRow}
                  onAddHeader={onAddHeader}
                  onJumpToHere={onJumpToHere}
                  getColumnWidth={getColumnWidth}
                />
              </React.Fragment>
            );
          })}
          
          {/* Drop indicator AFTER the last row (for end-of-list drops) */}
          {dropTargetIndex === items.length && (
            <tr>
              <td colSpan={visibleColumns.length + 1} className="p-0">
                <div className="h-1 bg-blue-500 w-full relative z-50 shadow-lg"></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Enhanced empty drop zone at the bottom */}
      <div 
        className="h-12 w-full border-t border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          console.log('🎯 Bottom zone drag over');
          onDragOver(e, items.length);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🎯 Bottom zone drop');
          onDrop(e, items.length);
        }}
      >
        {items.length > 0 ? 'Drop here to add to end' : 'Drop here to start your rundown'}
      </div>
      
      {items.length === 0 && (
        <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
          No items to display
        </div>
      )}
    </div>
  );
};

export default RundownTable;
