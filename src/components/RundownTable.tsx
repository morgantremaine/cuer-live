

import React from 'react';
import RundownRow from './RundownRow';
import RundownTableHeader from './RundownTableHeader';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableProps {
  items: any[]; // RundownItem[] | CalculatedRundownItem[];
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
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: any) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
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
  onAddRow,
  onAddHeader
}: RundownTableProps) => {

  return (
    <div className="relative">
      <RundownTableHeader 
        visibleColumns={visibleColumns}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
      />
      
      <div className="rundown-table-body">
        <table className="w-full table-fixed">
          <tbody>
            {items.map((item, index) => {
              // Convert calculated item back to regular item for display
              const displayItem = {
                ...item,
                startTime: item.calculatedStartTime || item.startTime,
                endTime: item.calculatedEndTime || item.endTime,
                elapsedTime: item.calculatedElapsedTime || item.elapsedTime,
                rowNumber: item.calculatedRowNumber || item.rowNumber
              };

              const rowNumber = getRowNumber(index);
              const status = getRowStatus(item);
              const headerDuration = isHeaderItem(item) ? calculateHeaderDuration(index) : '';
              const isSelected = selectedRows.has(item.id);
              const isDragging = draggedItemIndex === index;
              const isCurrentlyPlaying = item.id === currentSegmentId;

              return (
                <React.Fragment key={item.id}>
                  <RundownRow
                    item={displayItem}
                    index={index}
                    rowNumber={rowNumber}
                    status={status}
                    showColorPicker={showColorPicker}
                    cellRefs={cellRefs}
                    columns={visibleColumns}
                    isSelected={isSelected}
                    isCurrentlyPlaying={isCurrentlyPlaying}
                    isDraggingMultiple={isDraggingMultiple}
                    selectedRowsCount={selectedRows.size}
                    selectedRows={selectedRows}
                    headerDuration={headerDuration}
                    hasClipboardData={hasClipboardData}
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
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onCopySelectedRows={onCopySelectedRows}
                    onDeleteSelectedRows={onDeleteSelectedRows}
                    onPasteRows={onPasteRows}
                    onClearSelection={onClearSelection}
                    onAddRow={onAddRow}
                    onAddHeader={onAddHeader}
                    getColumnWidth={getColumnWidth}
                  />
                  
                  {/* Green line below current item for showcaller */}
                  {isCurrentlyPlaying && (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="p-0">
                        <div className="h-1 bg-green-500 w-full"></div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RundownTable;

