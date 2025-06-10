
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
        className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 font-mono align-middle border border-gray-300 bg-white" 
        style={{ 
          width: '40px',
          minWidth: '40px',
          display: 'table-cell',
          visibility: 'visible',
          opacity: 1,
          minHeight: '32px',
          border: '1px solid #d1d5db',
          backgroundColor: '#f3f4f6',
          position: 'relative',
          zIndex: 1
        }}
      >
        <span className="text-lg font-bold text-gray-900 dark:text-white">{rowNumber}</span>
      </td>
      {columns.map((column, columnIndex) => (
        <td 
          key={column.id} 
          className="px-2 py-2 align-middle border border-gray-300 bg-white" 
          style={{ 
            width: getColumnWidth(column),
            minWidth: '100px',
            display: 'table-cell',
            visibility: 'visible',
            opacity: 1,
            minHeight: '32px',
            border: '1px solid #d1d5db',
            backgroundColor: '#f3f4f6',
            position: 'relative',
            zIndex: 1
          }}
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
              className="w-full border border-gray-200 bg-white text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:border-blue-500 dark:focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-gray-400 rounded px-2 py-1 text-base font-bold"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                minHeight: '28px',
                position: 'relative',
                zIndex: 2
              }}
              placeholder="Segment Name"
            />
          ) : column.key === 'duration' ? (
            <span 
              className="text-sm text-gray-600 dark:text-gray-400 font-mono"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                position: 'relative',
                zIndex: 2
              }}
            >
              ({headerDuration})
            </span>
          ) : (
            // For all other columns (including custom columns), show empty cell for headers
            <div 
              className="px-1 py-0.5 text-sm text-gray-400 dark:text-gray-500"
              style={{
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                minHeight: '20px',
                position: 'relative',
                zIndex: 2
              }}
            >
              {/* Empty cell - headers don't use these columns */}
            </div>
          )}
        </td>
      ))}
    </>
  );
};

export default HeaderRowContent;
