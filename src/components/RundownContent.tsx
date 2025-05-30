
import React from 'react';
import RundownTable from './RundownTable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownContentProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  currentSegmentId: string | null;
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
}

const RundownContent = ({
  items,
  visibleColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  currentSegmentId,
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
  onDrop
}: RundownContentProps) => {
  return (
    <div className="relative">
      <ScrollArea className="w-full h-[calc(100vh-200px)]">
        <div className="min-w-max">
          <RundownTable
            items={items}
            visibleColumns={visibleColumns}
            currentTime={currentTime}
            showColorPicker={showColorPicker}
            cellRefs={cellRefs}
            selectedRows={selectedRows}
            draggedItemIndex={draggedItemIndex}
            currentSegmentId={currentSegmentId}
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
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default RundownContent;
