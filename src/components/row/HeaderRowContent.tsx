
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface HeaderRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  headerDuration: string;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const HeaderRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  headerDuration,
  isDraggingMultiple,
  isSelected,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: HeaderRowContentProps) => {
  const renderCellContent = (column: Column, value: string) => {
    if (column.id === 'rowNumber') {
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground">
            {rowNumber}
          </span>
          {headerDuration && (
            <span className="text-xs text-muted-foreground">
              ({headerDuration})
            </span>
          )}
        </div>
      );
    }

    const width = getColumnWidth(column);

    return (
      <div className="relative">
        <textarea
          ref={ref => cellRefs.current[`${item.id}-${column.id}`] = ref as HTMLTextAreaElement}
          className="w-full h-full bg-transparent border-none outline-none resize-none py-2 px-3"
          style={{ width: width, color: 'inherit' }}
          value={value || ''}
          onClick={(e) => {
            e.stopPropagation();
            onCellClick(item.id, column.id);
          }}
          onKeyDown={(e) => onKeyDown(e, item.id, column.id)}
          onChange={(e) => onUpdateItem(item.id, column.id, e.target.value)}
        />
      </div>
    );
  };

  return (
    <>
      {columns.map(column => (
        <td
          key={column.id}
          className="p-0 align-top"
          style={{
            width: getColumnWidth(column),
            minWidth: getColumnWidth(column)
          }}
        >
          {renderCellContent(column, item[column.id] || '')}
        </td>
      ))}
    </>
  );
};

export default HeaderRowContent;
