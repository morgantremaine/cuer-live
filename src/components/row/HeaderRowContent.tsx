
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
      <td 
        className="px-1 py-1 text-sm text-gray-600 dark:text-gray-400 font-mono align-middle" 
        style={{ width: '40px' }}
      >
        <span className="text-lg font-bold text-gray-900 dark:text-white">{rowNumber}</span>
      </td>
      {columns.map((column, columnIndex) => (
        <td 
          key={column.id} 
          className="px-1 py-2 align-middle" 
          style={{ width: getColumnWidth(column) }}
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
              className="flex-1 border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-400 rounded px-1 py-0.5 text-base w-full font-bold"
              placeholder="Segment Name"
            />
          ) : column.key === 'duration' ? (
            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">({headerDuration})</span>
          ) : column.key === 'notes' ? (
            <input
              ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
              type="text"
              value={item.notes || ''}
              onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(item.id, 'notes');
              }}
              onKeyDown={(e) => onKeyDown(e, item.id, 'notes')}
              className="flex-1 border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-400 rounded px-1 py-0.5 text-base w-full"
              placeholder="Header Description"
            />
          ) : (
            // For all other columns (including custom columns), show empty cell for headers
            <div className="px-1 py-0.5 text-sm text-gray-400 dark:text-gray-500">
              {/* Empty cell - headers don't use these columns */}
            </div>
          )}
        </td>
      ))}
    </>
  );
};

export default HeaderRowContent;
