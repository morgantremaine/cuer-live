import React from 'react';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface GridBasedRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected: boolean;
  isCurrentlyPlaying: boolean;
  isDraggingMultiple: boolean;
  selectedRowsCount: number;
  selectedRows: Set<string>;
  headerDuration: string;
  hasClipboardData: boolean;
  currentSegmentId: string | null;
  isDragging: boolean;
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
  onDrop: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onJumpToHere?: (itemId: string) => void;
  gridTemplateColumns: string;
}

const GridBasedRow = ({
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  isSelected,
  isCurrentlyPlaying,
  isDraggingMultiple,
  selectedRowsCount,
  selectedRows,
  headerDuration,
  hasClipboardData,
  currentSegmentId,
  isDragging,
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
  onDragEnd,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  gridTemplateColumns
}: GridBasedRowProps) => {

  const isHeader = isHeaderItem(item);
  
  // Row styling based on status and selection
  const getRowClasses = () => {
    let classes = 'contents'; // Use 'contents' to make children participate in grid
    
    if (isHeader) {
      classes += ' header-row';
    }
    
    return classes;
  };

  const getCellClasses = (isRowNumber = false) => {
    let classes = 'px-2 py-1 border-b border-border text-sm';
    
    if (isRowNumber) {
      classes += ' text-center font-medium bg-muted/50';
    } else {
      classes += ' bg-background';
    }
    
    if (isSelected) {
      classes += ' bg-blue-50 dark:bg-blue-900/20';
    }
    
    if (isCurrentlyPlaying) {
      classes += ' bg-green-50 dark:bg-green-900/20';
    }
    
    if (isDragging) {
      classes += ' opacity-50';
    }
    
    // Status-based styling
    if (status === 'completed' && !isHeader) {
      classes += ' bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400';
    } else if (status === 'current' && !isHeader) {
      classes += ' bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
    }
    
    // Header-specific styling
    if (isHeader) {
      if (item.color) {
        classes += ` text-white`;
      } else {
        classes += ' bg-gray-200 dark:bg-gray-700 font-semibold';
      }
    }
    
    return classes;
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const isShiftClick = e.shiftKey;
    const isCtrlClick = e.ctrlKey || e.metaKey;
    onRowSelect(item.id, index, isShiftClick, isCtrlClick);
  };

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={item.isFloating || false}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      itemType={isHeader ? "header" : "regular"}
      onCopy={onCopySelectedRows}
      onDelete={() => onDeleteRow(item.id)}
      onToggleFloat={() => onToggleFloat(item.id)}
      onColorPicker={() => onToggleColorPicker(item.id)}
      onColorSelect={onColorSelect}
      onPaste={onPasteRows}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      onJumpToHere={onJumpToHere}
    >
      <div 
        className={getRowClasses()}
        draggable={!isHeader}
        onDragStart={(e) => !isHeader && onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={handleRowClick}
        style={{
          backgroundColor: isHeader && item.color ? item.color : undefined,
          display: 'contents'
        }}
      >
        {/* Row number cell */}
        <div className={getCellClasses(true)}>
          {rowNumber}
          {isHeader && headerDuration && (
            <div className="text-xs text-muted-foreground">
              ({headerDuration})
            </div>
          )}
        </div>
        
        {/* Data cells */}
        {columns.map((column) => (
          <div key={column.id} className={getCellClasses()}>
            <CellRenderer
              item={item as any}
              column={column}
              cellRefs={cellRefs}
              currentSegmentId={currentSegmentId}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
            />
          </div>
        ))}
      </div>
    </RundownContextMenu>
  );
};

export default GridBasedRow;