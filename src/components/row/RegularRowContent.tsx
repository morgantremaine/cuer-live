
import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface RegularRowContentProps {
  item: RundownItem;
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

const RegularRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  status,
  backgroundColor,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  isSelected = false,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth,
  getHighlightForCell
}: RegularRowContentProps) => {
  // Use the passed backgroundColor or calculate from item color
  const finalBackgroundColor = backgroundColor || item.color;
  const textColor = finalBackgroundColor ? getContrastTextColor(finalBackgroundColor) : undefined;

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-2 py-1 text-sm font-mono align-middle border border-border w-16 min-w-16"
        style={{ backgroundColor: finalBackgroundColor }}
      >
        <div className="flex items-center space-x-1">
          {isCurrentlyPlaying && (
            <Play 
              className="h-5 w-5 text-blue-500 fill-blue-500" 
            />
          )}
          <span style={{ color: textColor }}>{rowNumber}</span>
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        
        return (
          <td
            key={column.id}
            className="align-middle border border-border"
            style={{ 
              width: columnWidth, 
              minWidth: columnWidth,
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
      })}
    </>
  );
};

export default RegularRowContent;
