
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  columns: Column[];
  visibleColumns: Column[];
  onUpdateItem: (itemId: string, field: string, value: string) => void;
  onDeleteRow: (itemId: string) => void;
  onToggleFloat: (itemId: string) => void;
  showColorPicker: string | null;
  onToggleColorPicker: (itemId: string | null) => void;
  selectedRows: Set<string>;
  onRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  isDragging: boolean;
  dropTargetIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onCellClick: (itemId: string, field: string, event: React.MouseEvent) => void;
  onKeyDown: (event: React.KeyboardEvent, itemId: string, field: string, itemIndex: number) => void;
  getRowNumber: (index: number) => string;
  getHeaderDuration: (id: string) => string;
  calculateHeaderDuration: (index: number) => string;
}

const RundownRow = ({
  item,
  index,
  columns,
  visibleColumns,
  onUpdateItem,
  onDeleteRow,
  onToggleFloat,
  showColorPicker,
  onToggleColorPicker,
  selectedRows,
  onRowSelection,
  isDragging,
  dropTargetIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  cellRefs,
  onCellClick,
  onKeyDown,
  getRowNumber,
  getHeaderDuration,
  calculateHeaderDuration
}: RundownRowProps) => {
  const isSelected = selectedRows.has(item.id);
  const isDraggedOver = dropTargetIndex === index;

  const handleRowClick = (e: React.MouseEvent) => {
    const isShiftClick = e.shiftKey;
    const isCtrlClick = e.ctrlKey || e.metaKey;
    onRowSelection(item.id, index, isShiftClick, isCtrlClick);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onRowSelection(item.id, index, false, true);
  };

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, index);
  };

  return (
    <>
      <tr
        data-item-id={item.id}
        className={`
          ${isHeaderItem(item) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isDraggedOver ? 'bg-blue-100 dark:bg-blue-800/30' : ''}
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          transition-colors duration-150
          ${item.isFloating ? 'opacity-75 italic' : ''}
        `}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {visibleColumns.map((column) => {
          const field = column.id;
          const value = item[field as keyof RundownItem] as string | undefined;

          return (
            <td
              key={column.id}
              className="border px-2 py-1 text-sm align-middle"
              style={{ width: column.width }}
              onClick={(e) => onCellClick(item.id, field, e)}
            >
              {field === 'color' ? (
                <div
                  className="w-6 h-6 rounded cursor-pointer"
                  style={{ backgroundColor: value || '#fff' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleColorPicker(item.id === showColorPicker ? null : item.id);
                  }}
                />
              ) : (
                <input
                  ref={(el) => {
                    if (el) {
                      cellRefs.current[`${item.id}-${field}`] = el;
                    }
                  }}
                  type="text"
                  value={value || ''}
                  onChange={(e) => onUpdateItem(item.id, field, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, item.id, field, index)}
                  className="w-full bg-transparent border-none outline-none text-sm"
                />
              )}
            </td>
          );
        })}
      </tr>
    </>
  );
};

export default RundownRow;
