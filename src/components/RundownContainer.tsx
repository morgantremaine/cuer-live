
import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { ClockFormat } from '@/hooks/useClockFormat';

interface RundownContainerProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  items: RundownItem[];
  visibleColumns: Column[];
  columns: Column[];
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  currentSegmentId: string | null;
  clockFormat: ClockFormat;
  onClockFormatToggle: () => void;
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
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleToggleColumnVisibility: (columnId: string) => void;
}

const RundownContainer = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  showColumnManager,
  setShowColumnManager,
  items,
  visibleColumns,
  columns,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  currentSegmentId,
  clockFormat,
  onClockFormatToggle,
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
  onDrop,
  onAddRow,
  onAddHeader,
  selectedCount,
  hasClipboardData,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection,
  selectedRowId,
  isPlaying,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleToggleColumnVisibility
}: RundownContainerProps) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-none mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <RundownHeaderSection
            currentTime={currentTime}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
            totalRuntime={totalRuntime}
            clockFormat={clockFormat}
            onClockFormatToggle={onClockFormatToggle}
            onAddRow={onAddRow}
            onAddHeader={onAddHeader}
            onShowColumnManager={() => setShowColumnManager(true)}
            selectedCount={selectedCount}
            hasClipboardData={hasClipboardData}
            onCopySelectedRows={onCopySelectedRows}
            onPasteRows={onPasteRows}
            onDeleteSelectedRows={onDeleteSelectedRows}
            onClearSelection={onClearSelection}
            selectedRowId={selectedRowId}
            isPlaying={isPlaying}
            currentSegmentId={currentSegmentId}
            timeRemaining={timeRemaining}
            onPlay={onPlay}
            onPause={onPause}
            onForward={onForward}
            onBackward={onBackward}
          />

          <RundownContent
            items={items}
            visibleColumns={visibleColumns}
            currentTime={currentTime}
            showColorPicker={showColorPicker}
            cellRefs={cellRefs}
            selectedRows={selectedRows}
            draggedItemIndex={draggedItemIndex}
            currentSegmentId={currentSegmentId}
            clockFormat={clockFormat}
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
            onDrop={onDrop}
          />
        </div>
      </div>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onClose={() => setShowColumnManager(false)}
        />
      )}
    </div>
  );
};

export default RundownContainer;
