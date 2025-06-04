import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface RegularRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  hasClipboardData?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RegularRow = ({
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  isSelected = false,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  selectedRowsCount = 1,
  selectedRows,
  hasClipboardData = false,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  isDragging,
  getColumnWidth
}: RegularRowProps) => {
  let rowClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
    } else {
      rowClass = 'opacity-50';
    }
  } else if (item.isFloating || item.isFloated) {
    rowClass = 'bg-red-800 text-white border-l-4 border-red-600';
  } else if (item.color && item.color !== '#FFFFFF') {
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  // Add selection styling to the row class
  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  const textColor = (item.isFloating || item.isFloated) ? 'white' : (item.color && item.color !== '#FFFFFF' ? getContrastTextColor(item.color) : '');

  // Create cell selection styling
  const getCellSelectionClass = () => {
    if (isSelected) {
      return 'ring-2 ring-inset ring-blue-500 border-blue-500';
    }
    return '';
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isRowNumberCell = target.closest('td')?.classList.contains('row-number-cell');
    const isRowElement = target === e.currentTarget;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Don't handle row selection if clicking on input fields
    if (isInput) {
      return;
    }
    
    if ((isRowElement || isRowNumberCell) && onRowSelect) {
      e.preventDefault();
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey);
    }
  };

  // Single row operations (work without selection)
  const handleSingleRowCopy = () => {
    // Temporarily select this row, copy it, then clear selection
    if (onRowSelect) {
      onRowSelect(item.id, index, false, false);
    }
    setTimeout(() => {
      onCopySelectedRows();
    }, 0);
  };

  const handleSingleRowPaste = () => {
    // Temporarily select this row for paste positioning, then paste
    if (onRowSelect) {
      onRowSelect(item.id, index, false, false);
    }
    setTimeout(() => {
      if (onPasteRows) {
        onPasteRows();
      }
    }, 0);
  };

  const handleSingleRowDelete = () => {
    onDeleteRow(item.id);
  };

  const handleSingleRowFloat = () => {
    onToggleFloat(item.id);
  };

  const handleSingleRowColor = () => {
    onToggleColorPicker(item.id);
  };

  // Context menu handlers - use single row operations if not part of multi-selection
  const handleContextMenuCopy = () => {
    if (isSelected && selectedRowsCount > 1) {
      onCopySelectedRows();
    } else {
      handleSingleRowCopy();
    }
  };

  const handleContextMenuDelete = () => {
    if (isSelected && selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      handleSingleRowDelete();
    }
  };

  const handleContextMenuFloat = () => {
    if (isSelected && selectedRowsCount > 1 && selectedRows) {
      // Toggle float for all selected rows
      selectedRows.forEach(selectedId => {
        onToggleFloat(selectedId);
      });
    } else {
      handleSingleRowFloat();
    }
  };

  const handleContextMenuColor = () => {
    handleSingleRowColor();
  };

  const handleContextMenuPaste = () => {
    if (isSelected && selectedRowsCount > 1) {
      // For multi-selection, paste after the last selected row
      if (onPasteRows) {
        onPasteRows();
      }
    } else {
      handleSingleRowPaste();
    }
  };

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={item.isFloating || item.isFloated}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={handleContextMenuFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
    >
      <tr 
        className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} transition-all cursor-pointer select-none`}
        style={{ 
          backgroundColor: (item.isFloating || item.isFloated) ? '#991b1b' : (item.color && item.color !== '#FFFFFF' ? item.color : undefined),
          color: textColor || undefined
        }}
        draggable
        onClick={handleRowClick}
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        <td 
          className={`px-2 py-1 text-sm font-mono cursor-move row-number-cell align-middle`}
          style={{ color: textColor || undefined, width: '40px' }}
        >
          <div className="flex items-center space-x-1">
            {isCurrentlyPlaying && (
              <Play className="h-3 w-3 text-green-500 fill-green-500" />
            )}
            <span>{rowNumber}</span>
            {isDraggingMultiple && isSelected && (
              <span className="text-xs bg-blue-500 text-white px-1 rounded">M</span>
            )}
          </div>
        </td>
        {columns.map((column) => (
          <CellRenderer
            key={column.id}
            column={column}
            item={item}
            cellRefs={cellRefs}
            textColor={textColor}
            onUpdateItem={onUpdateItem}
            onCellClick={onCellClick}
            onKeyDown={onKeyDown}
            width={getColumnWidth(column)}
          />
        ))}
      </tr>
    </RundownContextMenu>
  );
};

export default RegularRow;
