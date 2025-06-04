
import React from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  selectedRowsCount: number;
  selectedRows?: Set<string>;
  headerDuration: string;
  hasClipboardData?: boolean;
  currentHighlight?: SearchHighlight | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRowAfter?: (itemId: string) => void;
  onAddHeaderAfter?: (itemId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const HeaderRow = ({
  item,
  index,
  rowNumber,
  showColorPicker,
  cellRefs,
  columns,
  isSelected = false,
  selectedRowsCount,
  selectedRows,
  headerDuration,
  hasClipboardData = false,
  currentHighlight,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onRowSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRowAfter,
  onAddHeaderAfter,
  isDragging,
  getColumnWidth
}: HeaderRowProps) => {
  const handleRowClick = (e: React.MouseEvent) => {
    if (onRowSelect) {
      const isShiftClick = e.shiftKey;
      const isCtrlClick = e.ctrlKey || e.metaKey;
      onRowSelect(item.id, index, isShiftClick, isCtrlClick);
    }
  };

  const handleCopy = () => {
    onCopySelectedRows();
  };

  const handleDelete = () => {
    if (selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const textColor = item.color && item.color !== '#ffffff' ? 'white' : '';

  return (
    <RundownContextMenu
      selectedCount={selectedRowsCount}
      selectedRows={selectedRows}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      onCopy={handleCopy}
      onDelete={handleDelete}
      onToggleFloat={() => {}} // Headers don't float
      onColorPicker={() => onToggleColorPicker(item.id)}
      onColorSelect={onColorSelect}
      onPaste={onPasteRows}
      onClearSelection={onClearSelection}
      onAddRowAfter={onAddRowAfter}
      onAddHeaderAfter={onAddHeaderAfter}
    >
      <tr
        className={`
          bg-gray-100 dark:bg-gray-700 font-semibold border-b border-gray-200 dark:border-gray-600
          ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
          ${isDragging ? 'opacity-50' : ''}
          cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600
        `}
        style={{ backgroundColor: item.color !== '#ffffff' && item.color ? item.color : undefined }}
        onClick={handleRowClick}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        <td className="px-1 py-2 text-sm font-bold w-12 text-center border-r border-gray-200 dark:border-gray-600">
          <span style={{ color: textColor || undefined }}>{rowNumber}</span>
        </td>
        
        {columns.map((column) => {
          if (column.key === 'duration') {
            return (
              <td key={column.id} className="px-1 py-2 text-sm text-center border-r border-gray-200 dark:border-gray-600" style={{ width: getColumnWidth(column) }}>
                <span className="font-mono text-gray-600 dark:text-gray-400">({headerDuration})</span>
              </td>
            );
          }
          
          return (
            <CellRenderer
              key={column.id}
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={textColor}
              currentHighlight={currentHighlight}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              width={getColumnWidth(column)}
            />
          );
        })}
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;
