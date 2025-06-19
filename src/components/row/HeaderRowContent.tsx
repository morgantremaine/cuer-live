
import React from 'react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface HeaderRowContentProps {
  item: RundownItem;
  rowNumber: string;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected: boolean;
  isDraggingMultiple: boolean;
  selectedRowsCount: number;
  selectedRows: Set<string>;
  headerDuration: string;
  hasClipboardData: boolean;
  isDragging: boolean;
  backgroundColor?: string;
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
  onDrop: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  getColumnWidth: (column: Column) => string;
  getHighlightForCell?: (itemId: string, field: string) => { startIndex: number; endIndex: number } | null;
}

const HeaderRowContent = ({
  item,
  columns,
  headerDuration,
  rowNumber,
  cellRefs,
  backgroundColor,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth,
  getHighlightForCell
}: HeaderRowContentProps) => {
  // Use the passed backgroundColor or calculate from item color
  const finalBackgroundColor = backgroundColor || item.color;
  const textColor = finalBackgroundColor ? getContrastTextColor(finalBackgroundColor) : undefined;

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-3 py-3 text-base font-mono font-semibold align-middle border border-border min-h-[56px]"
        style={{ 
          backgroundColor: finalBackgroundColor,
          width: '64px',
          minWidth: '64px', 
          maxWidth: '64px' // Ensure exact width matching
        }}
      >
        <span style={{ color: textColor }}>{rowNumber}</span>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        const widthValue = parseInt(columnWidth.replace('px', ''));
        
        // Special handling for headers - only show specific fields
        if (column.key === 'segmentName' || column.key === 'name') {
          // Show the header name - this is the editable field for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor: finalBackgroundColor 
              }}
            >
              <CellRenderer
                column={column}
                item={item}
                cellRefs={cellRefs}
                textColor={textColor}
                backgroundColor={finalBackgroundColor}
                onUpdateItem={onUpdateItem}
                onCellClick={onCellClick}
                onKeyDown={onKeyDown}
                width={columnWidth}
                getHighlightForCell={getHighlightForCell}
              />
            </td>
          );
        } else if (column.key === 'duration') {
          // Show the calculated header duration in parentheses - remove overflow hidden to prevent truncation
          return (
            <td
              key={column.id}
              className="align-middle border border-border px-3 py-3 min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor: finalBackgroundColor 
              }}
            >
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap" style={{ color: textColor }}>
                ({headerDuration})
              </div>
            </td>
          );
        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
          // Don't show time fields for headers - empty cell
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor: finalBackgroundColor 
              }}
            >
              <div className="px-3 py-3"></div>
            </td>
          );
        } else {
          // For other columns, show empty cell for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor: finalBackgroundColor 
              }}
            >
              <div className="px-3 py-3"></div>
            </td>
          );
        }
      })}
    </>
  );
};

export default HeaderRowContent;
