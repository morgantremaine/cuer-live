import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RundownTableHeader from './RundownTableHeader';
import OptimizedRundownTableWrapper from './OptimizedRundownTableWrapper';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownContentProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData: boolean;
  selectedRowId: string | null;
  startTime?: string;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  columnExpandState?: { [columnKey: string]: boolean };
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onToggleColumn?: (columnId: string) => void;
  onReorderColumns?: (columns: Column[]) => void;
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere: (itemId: string) => void;
  onDragStart?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  sensors?: any;
}

const RundownContent = ({
  items,
  visibleColumns,
  currentTime,
  showColorPicker,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData,
  selectedRowId,
  startTime,
  columnExpandState,
  cellRefs,
  getColumnWidth,
  updateColumnWidth,
  onToggleColumn,
  onReorderColumns,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  onDragStart,
  onDragEnd,
  sensors
}: RundownContentProps) => {

  // Create sortable items for @dnd-kit
  const sortableItems = items.map(item => item.id);

  return (
    <div className="min-h-0 flex-1 bg-background">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext 
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <div className="overflow-hidden">
              <div className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-12rem)] scroll-container">
                <table className="w-full">
                  <RundownTableHeader
                    visibleColumns={visibleColumns}
                    getColumnWidth={getColumnWidth}
                    updateColumnWidth={updateColumnWidth}
                    onReorderColumns={onReorderColumns}
                  />
                  <OptimizedRundownTableWrapper
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
                    selectedRowId={selectedRowId}
                    startTime={startTime}
                    columnExpandState={columnExpandState}
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
                    onCopySelectedRows={onCopySelectedRows}
                    onDeleteSelectedRows={onDeleteSelectedRows}
                    onPasteRows={onPasteRows}
                    onClearSelection={onClearSelection}
                    onAddRow={onAddRow}
                    onAddHeader={onAddHeader}
                    onJumpToHere={onJumpToHere}
                  />
                </table>
              </div>
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default RundownContent;