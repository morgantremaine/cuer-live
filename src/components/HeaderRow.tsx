
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  headerDuration: string;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  isSelected?: boolean;
  showColorPicker: string | null;
  hasClipboardData?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const HeaderRow = ({
  item,
  index,
  rowNumber,
  cellRefs,
  columns,
  headerDuration,
  selectedRowsCount = 1,
  selectedRows,
  isSelected = false,
  showColorPicker,
  hasClipboardData = false,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onDeleteRow,
  onDragStart,
  onDragOver,
  onDrop,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onToggleColorPicker,
  onColorSelect,
  onPasteRows,
  onClearSelection,
  onRowSelect,
  isDragging,
  getColumnWidth
}: HeaderRowProps) => {
  let rowClass = '';
  
  if (isDragging) {
    rowClass = 'bg-blue-100 dark:bg-blue-900 opacity-50';
  } else {
    // Default header styling without selection background
    rowClass = 'bg-gray-200 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700';
  }

  // Add selection styling with ring like regular rows
  if (isSelected) {
    rowClass += ' ring-2 ring-inset ring-blue-500 border-blue-500';
  }

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Don't handle row selection if clicking on input fields
    if (isInput) {
      return;
    }
    
    // Prevent event bubbling and ensure selection happens
    e.stopPropagation();
    
    // Select the row for any click in non-text areas
    if (onRowSelect) {
      console.log('HeaderRow: Calling onRowSelect for item', item.id, 'at index', index);
      const isShiftClick = e.shiftKey;
      const isCtrlClick = e.ctrlKey || e.metaKey;
      onRowSelect(item.id, index, isShiftClick, isCtrlClick);
    }
  };

  const handleCellClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Don't handle row selection if clicking on input fields
    if (isInput) {
      return;
    }
    
    // Call the row click handler for non-input clicks
    handleRowClick(e);
  };

  // Context menu handlers - use selection-based operations
  const handleContextMenuCopy = () => {
    onCopySelectedRows();
  };

  const handleContextMenuDelete = () => {
    if (isSelected && selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const handleContextMenuFloat = () => {
    // Headers don't float, but we'll keep the interface consistent
  };

  const handleContextMenuColor = () => {
    onToggleColorPicker(item.id);
  };

  const handleContextMenuPaste = () => {
    if (onPasteRows) {
      onPasteRows();
    }
  };

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={false}
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
        className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} transition-colors cursor-pointer`}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
        onClick={handleRowClick}
      >
        <td 
          className="px-1 py-1 text-sm text-gray-600 dark:text-gray-400 font-mono align-middle" 
          style={{ width: '40px' }}
          onClick={handleCellClick}
        >
          <span className="text-lg font-bold text-gray-900 dark:text-white">{item.segmentName}</span>
        </td>
        {columns.map((column, columnIndex) => (
          <td 
            key={column.id} 
            className="px-1 py-2 align-middle" 
            style={{ width: getColumnWidth(column) }}
            onClick={handleCellClick}
          >
            {column.key === 'segmentName' ? (
              <input
                ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
                type="text"
                value={item.notes}
                onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row selection when clicking input
                  onCellClick(item.id, 'notes');
                }}
                onKeyDown={(e) => onKeyDown(e, item.id, 'notes')}
                className="flex-1 border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-400 rounded px-1 py-0.5 text-base w-full"
              />
            ) : column.key === 'duration' ? (
              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">({headerDuration})</span>
            ) : column.key === 'notes' ? (
              null
            ) : null}
          </td>
        ))}
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;
