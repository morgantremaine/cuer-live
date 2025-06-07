import React, { useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { getCellValue } from '@/utils/sharedRundownUtils';
import { useContextMenu } from '@/hooks/useContextMenu';
import { SearchHighlight } from '@/types/search';

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
  currentHighlight?: SearchHighlight | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat?: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
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
  currentHighlight,
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
  onAddRow,
  onAddHeader,
  isDragging,
  getColumnWidth
}: RegularRowProps) => {
  const { showContextMenu } = useContextMenu();
  const isEditing = showColorPicker === item.id;

  const handleCellDoubleClick = (field: string) => {
    onCellClick(item.id, field);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
    onUpdateItem(item.id, field, e.target.value);
  };

  const handleTextareaBlur = (field: string) => {
    if (item.id) {
      const value = cellRefs.current[item.id + field]?.value || '';
      onUpdateItem(item.id, field, value);
    }
  };

  const handleColorSelectWrapper = (color: string) => {
    onColorSelect(item.id, color);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (onRowSelect) {
      const isShiftClick = e.shiftKey;
      const isCtrlClick = e.ctrlKey;
      onRowSelect(item.id, index, isShiftClick, isCtrlClick);
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (selectedRowsCount <= 1 || !selectedRows?.has(item.id)) {
      onRowSelect && onRowSelect(item.id, index, false, false);
    }
    showContextMenu(event, {
      items: [
        { label: 'Copy', action: onCopySelectedRows },
        { label: 'Paste', action: onPasteRows, disabled: !hasClipboardData },
        { label: 'Add Row', action: onAddRow },
        { label: 'Add Header', action: onAddHeader },
        { label: 'Clear Selection', action: onClearSelection, disabled: selectedRowsCount === 0 },
        { label: 'Delete', action: onDeleteSelectedRows, disabled: selectedRowsCount === 0 },
        { label: 'Delete Row', action: () => onDeleteRow(item.id) },
        { label: 'Toggle Float', action: () => onToggleFloat && onToggleFloat(item.id) },
      ],
    });
  };

  const rowClassName = `
    ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'bg-white dark:bg-gray-800'}
    ${isDragging ? 'opacity-50' : ''}
    ${isDraggingMultiple ? 'border-2 border-blue-500' : ''}
    hover:bg-gray-100 dark:hover:bg-gray-700
    cursor-pointer
    print:bg-white
    print:dark:bg-white
    break-inside-avoid
  `;

  const rowStyle = {
    backgroundColor: item.color !== '#ffffff' && item.color ? item.color : undefined,
  };

  return (
    <tr
      className={rowClassName}
      style={rowStyle}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      <td 
        className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 dark:border-gray-600 sticky left-0 bg-white dark:bg-gray-800 z-10"
        style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
      >
        <div className="flex items-center relative">
          {isCurrentlyPlaying && (
            <span 
              className="text-blue-500 mr-2 text-lg font-bold"
              style={{ textShadow: '0 0 2px rgba(0,0,0,0.5)' }}
            >
              ▶
            </span>
          )}
          {item.isFloating && (
            <span className="text-yellow-400 mr-1">🛟</span>
          )}
          <span>{rowNumber}</span>
        </div>
      </td>
      
      {columns.map((column) => {
        const value = getCellValue(item, column);
        const isHighlighted = currentHighlight?.itemId === item.id && currentHighlight?.field === column.key;
        
        return (
          <td
            key={column.id}
            className={`px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-600 ${isHighlighted ? 'bg-yellow-200' : ''}`}
            style={{ width: getColumnWidth(column), minWidth: getColumnWidth(column) }}
          >
            {column.key === 'color' ? (
              <button
                onClick={() => onToggleColorPicker(item.id)}
                className="w-full h-full rounded-md"
                style={{ backgroundColor: item.color, minHeight: '1.75rem' }}
              />
            ) : (
              <div className="relative">
                <div
                  className="absolute inset-0 flex items-center pl-2 pointer-events-none"
                >
                </div>
                {column.key === 'script' || column.key === 'notes' ? (
                  <textarea
                    ref={(el) => (cellRefs.current[item.id + column.key] = el as HTMLTextAreaElement)}
                    defaultValue={value}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    onBlur={() => handleTextareaBlur(column.key)}
                    onDoubleClick={() => handleCellDoubleClick(column.key)}
                    onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
                  />
                ) : (
                  <input
                    type="text"
                    defaultValue={value}
                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    onChange={(e) => handleInputChange(e, column.key)}
                    onDoubleClick={() => handleCellDoubleClick(column.key)}
                    onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
                  />
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
};

export default RegularRow;
