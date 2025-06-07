
import React from 'react';
import RundownTableHeader from './RundownTableHeader';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';

interface RundownTableProps {
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
  onAddRow?: () => void;
  onAddHeader?: () => void;
  currentHighlight?: SearchHighlight | null;
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
  onAddRow,
  onAddHeader,
  currentHighlight
}: RundownTableProps) => {
  
  return (
    <div 
      className="w-full"
      onDragLeave={onDragLeave}
    >
      <table className="w-full min-w-max">
        <RundownTableHeader
          visibleColumns={visibleColumns}
          getColumnWidth={getColumnWidth}
          updateColumnWidth={updateColumnWidth}
        />
        <tbody>
          {items.map((item, index) => {
            const isCurrentlyPlaying = !isHeaderItem(item) && currentSegmentId === item.id;
            
            return (
              <React.Fragment key={item.id}>
                {/* Visual indicator above current playing row */}
                {isCurrentlyPlaying && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-3 flex items-center relative">
                        {/* Top border with animated pulse */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 animate-pulse"></div>
                        {/* Corner indicators */}
                        <div className="absolute top-0 left-2">
                          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-green-500"></div>
                        </div>
                        <div className="absolute top-0 right-2">
                          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-green-500"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                
                {/* Drop indicator above current row */}
                {dropTargetIndex === index && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-gray-400 mx-2"></div>
                    </td>
                  </tr>
                )}
                
                <RundownRow
                  item={item}
                  index={index}
                  rowNumber={getRowNumber(index)}
                  status={item.status}
                  showColorPicker={showColorPicker}
                  cellRefs={cellRefs}
                  columns={visibleColumns}
                  isSelected={selectedRows.has(item.id)}
                  isCurrentlyPlaying={isCurrentlyPlaying}
                  isDraggingMultiple={isDraggingMultiple && selectedRows.has(item.id)}
                  selectedRowsCount={selectedRows.size}
                  selectedRows={selectedRows}
                  headerDuration={isHeaderItem(item) ? calculateHeaderDuration(index) : ''}
                  hasClipboardData={hasClipboardData}
                  currentHighlight={currentHighlight}
                  onUpdateItem={onUpdateItem}
                  onCellClick={onCellClick}
                  onKeyDown={onKeyDown}
                  onToggleColorPicker={onToggleColorPicker}
                  onColorSelect={(id, color) => onColorSelect(id, color)}
                  onDeleteRow={onDeleteRow}
                  onToggleFloat={onToggleFloat}
                  onRowSelect={onRowSelect}
                  onDragStart={onDragStart}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={onDrop}
                  onCopySelectedRows={onCopySelectedRows}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  onPasteRows={onPasteRows}
                  onClearSelection={onClearSelection}
                  onAddRow={onAddRow}
                  onAddHeader={onAddHeader}
                  isDragging={draggedItemIndex === index}
                  getColumnWidth={getColumnWidth}
                />

                {/* Visual indicator below current playing row */}
                {isCurrentlyPlaying && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-3 flex items-center relative">
                        {/* Bottom border with animated pulse */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-yellow-500 to-blue-500 animate-pulse"></div>
                        {/* Corner indicators */}
                        <div className="absolute bottom-0 left-2">
                          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-yellow-500"></div>
                        </div>
                        <div className="absolute bottom-0 right-2">
                          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-yellow-500"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                
                {/* Drop indicator after last row */}
                {index === items.length - 1 && dropTargetIndex === items.length && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-gray-400 mx-2"></div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RundownTable;
