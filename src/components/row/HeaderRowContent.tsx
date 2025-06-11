
import React from 'react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface HeaderRowContentProps {
  item: RundownItem;
  columns: Column[];
  headerDuration: string;
  rowNumber: string;
  backgroundColor?: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const HeaderRowContent = ({
  item,
  columns,
  headerDuration,
  rowNumber,
  backgroundColor,
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: HeaderRowContentProps) => {
  return (
    <>
      <td 
        className="px-2 py-1 text-sm font-mono align-middle border-r border-border w-12 min-w-12"
        style={{ backgroundColor }}
      >
        <div className="flex items-center space-x-1">
          <span className="text-foreground font-bold"></span>
        </div>
      </td>
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        
        return (
          <td
            key={column.id}
            className="align-middle border-r border-border last:border-r-0"
            style={{ 
              width: columnWidth, 
              minWidth: columnWidth,
              backgroundColor 
            }}
          >
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              width={columnWidth}
            />
          </td>
        );
      })}
    </>
  );
};

export default HeaderRowContent;
