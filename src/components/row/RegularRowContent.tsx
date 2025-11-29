import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';
import { getContrastTextColor } from '@/utils/colorUtils';
import { getMinimumWidth } from '@/utils/columnSizing';
import { getUserColorHex, getBadgeBgClass } from '@/utils/editorColors';

interface RegularRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  status?: 'upcoming' | 'current' | 'completed';
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  currentSegmentId?: string | null;
  columnExpandState?: { [columnKey: string]: boolean };
  expandedCells?: Set<string>;
  onToggleCellExpanded?: (itemId: string, columnKey: string) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  markActiveTyping?: () => void;
  getColumnWidth: (column: Column) => string;
  getEditorForCell?: (itemId: string, field: string) => { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
}

const RegularRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  backgroundColor,
  status,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  isSelected = false,
  currentSegmentId,
  columnExpandState = {},
  expandedCells,
  onToggleCellExpanded,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  markActiveTyping,
  getColumnWidth,
  getEditorForCell,
  onCellFocus,
  onCellBlur
}: RegularRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  return (
    <>
      <td 
        className="px-2 py-1 text-sm font-mono align-middle"
        style={{ 
          width: '64px',
          minWidth: '64px',
          maxWidth: '64px',
          borderRight: '1px solid hsl(var(--border))',
          position: 'sticky',
          left: 0,
          zIndex: 10,
          backgroundColor: backgroundColor || 'hsl(var(--background))'
        }}
      >
        <div className="flex items-center justify-center relative w-full">
          {isCurrentlyPlaying && (
            <Play 
              className="h-6 w-6 text-blue-500 fill-blue-500 absolute left-0" 
            />
          )}
          <span style={{ color: textColor }} className={isCurrentlyPlaying ? 'ml-5' : ''}>{rowNumber}</span>
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column, index) => {
        const columnWidth = getColumnWidth(column);
        const isLastColumn = index === columns.length - 1;
        const isCurrentSegmentName = currentSegmentId === item.id && 
          (column.key === 'segmentName' || column.key === 'name');
        
        // Normalize width to enforce the same minimums as the header
        const rawWidth = parseFloat(columnWidth.replace('px', ''));
        const normalizedWidth = `${Math.max(isNaN(rawWidth) ? 0 : rawWidth, getMinimumWidth(column))}px`;
        
        // Get active editor for this cell
        const activeEditor = getEditorForCell ? getEditorForCell(item.id, column.key) : null;
        
        return (
          <td
            key={column.id}
            className={`align-middle ${isCurrentSegmentName || activeEditor ? 'relative' : ''}`}
            style={{ 
              width: normalizedWidth,
              minWidth: normalizedWidth,
              maxWidth: normalizedWidth,
              backgroundColor: isCurrentSegmentName ? '#3b82f6' : 'transparent',
              borderRight: isLastColumn ? 'none' : '1px solid hsl(var(--border))',
              boxShadow: activeEditor ? `inset 0 0 0 2px ${getUserColorHex(activeEditor.userId)}` : 'none'
            }}
          >
            {/* Badge positioned relative to td */}
            {activeEditor && (
              <div className="absolute -top-2.5 -right-2 z-50">
                <div className={`${getBadgeBgClass(activeEditor.userId)} text-white text-xs px-2 py-0.5 rounded-full shadow-md whitespace-nowrap`}>
                  {activeEditor.userName}
                </div>
              </div>
            )}
            
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={isCurrentSegmentName ? '#ffffff' : textColor}
              backgroundColor="transparent"
              currentSegmentId={currentSegmentId}
              columnExpandState={columnExpandState}
              expandedCells={expandedCells}
              onToggleCellExpanded={onToggleCellExpanded}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              markActiveTyping={markActiveTyping}
              width={normalizedWidth}
              onCellFocus={onCellFocus}
              onCellBlur={onCellBlur}
            />
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
