
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import ShowCaller from './ShowCaller';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownMainContentProps {
  currentTime: Date;
  items: RundownItem[];
  visibleColumns: Column[];
  columns: Column[];
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  timeRemaining: number;
  totalDuration: number;
  currentSegmentName: string;
  isPlaying: boolean;
  hasClipboardData?: boolean;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newName: string) => void;
  handleToggleColumnVisibility: (columnId: string) => void;
  handleLoadLayout: (layoutColumns: Column[]) => void;
}

const RundownMainContent = ({
  currentTime,
  items,
  visibleColumns,
  columns,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  timeRemaining,
  totalDuration,
  currentSegmentName,
  isPlaying,
  hasClipboardData = false,
  getColumnWidth,
  updateColumnWidth,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  showColumnManager,
  setShowColumnManager,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleRenameColumn,
  handleToggleColumnVisibility,
  handleLoadLayout
}: RundownMainContentProps) => {
  return (
    <>
      <ShowCaller
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        currentSegmentName={currentSegmentName}
      />
      
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
      
      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onLoadLayout={handleLoadLayout}
          onRenameColumn={handleRenameColumn}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </>
  );
};

export default RundownMainContent;
