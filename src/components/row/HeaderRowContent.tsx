
import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface HeaderRowContentProps {
  item: RundownItem;
  columns: Column[];
  headerDuration: string;
  rowNumber: string;
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
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: HeaderRowContentProps) => {
  return (
    <>
      <td className="px-2 py-1 text-sm text-muted-foreground font-mono align-middle border border-border bg-muted w-12 min-w-12">
        <span className="text-lg font-bold text-foreground">{rowNumber}</span>
      </td>
      {columns.map((column, columnIndex) => {
        const columnWidth = getColumnWidth(column);
        
        return (
          <td 
            key={column.id} 
            className="px-2 py-2 align-middle border border-border bg-muted" 
            style={{ width: columnWidth, minWidth: columnWidth }}
          >
            {column.key === 'segmentName' ? (
              <input
                ref={el => el && (cellRefs.current[`${item.id}-segmentName`] = el)}
                type="text"
                value={item.name || ''}
                onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  onCellClick(item.id, 'name');
                }}
                onKeyDown={(e) => onKeyDown(e, item.id, 'name')}
                className="w-full border border-border bg-background text-foreground placeholder-muted-foreground focus:bg-background focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 text-base font-bold"
                placeholder="Segment Name"
              />
            ) : column.key === 'duration' ? (
              <span className="text-sm text-muted-foreground font-mono">
                ({headerDuration})
              </span>
            ) : (
              // For all other columns, show empty cell for headers
              <div className="px-1 py-0.5 text-sm text-muted-foreground">
                {/* Empty cell - headers don't use these columns */}
              </div>
            )}
          </td>
        );
      })}
    </>
  );
};

export default HeaderRowContent;
