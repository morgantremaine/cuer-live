import React from 'react';
import GridBasedRow from './GridBasedRow';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface GridBasedTableBodyProps {
  items: RundownItem[];
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
  startTime: string;
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
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
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
  gridTemplateColumns: string;
}

const GridBasedTableBody = ({
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
  startTime,
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
  gridTemplateColumns
}: GridBasedTableBodyProps) => {

  return (
    <div className="bg-background" style={{ gridColumn: '1 / -1' }}>
      {items.map((item, index) => {
        const rowNumber = getRowNumber(index);
        const status = getRowStatus(item, currentTime);
        const headerDuration = item.type === 'header' ? calculateHeaderDuration(index) : '';
        const isMultiSelected = selectedRows.has(item.id);
        const isSingleSelected = selectedRowId === item.id;
        const isActuallySelected = isMultiSelected || isSingleSelected;
        const isDragging = draggedItemIndex === index;
        const isCurrentlyPlaying = item.id === currentSegmentId;

        return (
          <div key={item.id} style={{ display: 'contents' }}>
            {/* Drop indicator ABOVE this row */}
            {dropTargetIndex === index && (
              <div 
                className="h-0.5 bg-blue-500 w-full relative z-50"
                style={{ gridColumn: '1 / -1' }}
              />
            )}
            
            <GridBasedRow
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
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
              onCopySelectedRows={onCopySelectedRows}
              onDeleteSelectedRows={onDeleteSelectedRows}
              onPasteRows={onPasteRows || (() => {})}
              onClearSelection={onClearSelection || (() => {})}
              onAddRow={onAddRow || (() => {})}
              onAddHeader={onAddHeader || (() => {})}
              onJumpToHere={onJumpToHere}
              gridTemplateColumns={gridTemplateColumns}
            />
            
            {/* Drop indicator AFTER the last row */}
            {dropTargetIndex === items.length && index === items.length - 1 && (
              <div 
                className="h-0.5 bg-blue-500 w-full relative z-50"
                style={{ gridColumn: '1 / -1' }}
              />
            )}
          </div>
        );
      })}
      
      {items.length === 0 && (
        <div 
          className="p-4 text-center text-muted-foreground"
          style={{ gridColumn: '1 / -1' }}
        >
          No items to display
        </div>
      )}
    </div>
  );
};

export default GridBasedTableBody;