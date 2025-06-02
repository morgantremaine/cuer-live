
import React from 'react';
import RundownContent from './RundownContent';
import ShowCaller from './ShowCaller';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownMainContentProps {
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
  hasClipboardData?: boolean;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  findCurrentItem?: (currentTime: Date) => RundownItem | null;
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
}

const RundownMainContent = ({
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
  hasClipboardData = false,
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  findCurrentItem,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection
}: RundownMainContentProps) => {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Show caller display */}
      <div className="mb-4">
        <ShowCaller 
          findCurrentItem={findCurrentItem}
          currentTime={currentTime}
        />
      </div>

      {/* Rundown content */}
      <RundownContent
        items={items}
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
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        onToggleColorPicker={onToggleColorPicker}
        onColorSelect={onColorSelect}
        onDeleteRow={onDeleteRow}
        onToggleFloat={onToggleFloat}
        onRowSelect={onRowSelect}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onCopySelectedRows={onCopySelectedRows}
        onDeleteSelectedRows={onDeleteSelectedRows}
        onPasteRows={onPasteRows}
        onClearSelection={onClearSelection}
      />
    </div>
  );
};

export default RundownMainContent;
