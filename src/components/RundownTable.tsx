
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere
}: RundownTableProps) => {

  // Handler for drag over events on the table container
  const handleTableDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e);
  };

  // Enhanced row drag over handler that calculates drop target index
  const handleRowDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call the parent handler with target index
    onDragOver(e, targetIndex);
  };

  // Debug wrapper for onJumpToHere
  const handleJumpToHereDebug = (segmentId: string) => {
    console.log('🎯 RundownTable: onJumpToHere called with segmentId:', segmentId);
    console.log('🎯 RundownTable: onJumpToHere function exists:', !!onJumpToHere);
    if (onJumpToHere) {
      console.log('🎯 RundownTable: Calling parent onJumpToHere');
      onJumpToHere(segmentId);
    } else {
      console.log('🎯 RundownTable: onJumpToHere is undefined!');
    }
  };

  return (
    <div className="relative w-full bg-background" onDragOver={handleTableDragOver}>
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
                {/* Show drop indicator line ABOVE this row if it's the drop target */}
                {dropTargetIndex === index && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-gray-400 w-full relative z-50"></div>
                    </td>
                  </tr>
                )}
                
                {/* Add data-item-id attribute to the table row wrapper for autoscroll functionality */}
                <tr data-item-id={item.id}>
                  <td colSpan={visibleColumns.length + 1} className="p-0">
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
                      onDrop={(e) => {
                        onDrop(e, index);
                      }}
                      onCopySelectedRows={onCopySelectedRows}
                      onDeleteSelectedRows={onDeleteSelectedRows}
                      onPasteRows={onPasteRows}
                      onClearSelection={onClearSelection}
                      onAddRow={onAddRow}
                      onAddHeader={onAddHeader}
                      onJumpToHere={handleJumpToHereDebug}
                      getColumnWidth={getColumnWidth}
                    />
                  </td>
                </tr>
                
                {/* Show drop indicator line AFTER the last row if it's the drop target */}
                {dropTargetIndex === items.length && index === items.length - 1 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-gray-400 w-full relative z-50"></div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {items.length === 0 && (
        <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
          No items to display
        </div>
      )}
    </div>
  );
};

export default RundownTable;
