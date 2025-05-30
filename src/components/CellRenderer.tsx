
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/hooks/useRundownItems';

interface CellRendererProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const CellRenderer = ({
  column,
  item,
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown
}: CellRendererProps) => {
  const getCellValue = (column: Column) => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    return (item as any)[column.key] || '';
  };

  const getFieldKey = (column: Column) => {
    return column.isCustom ? column.key : column.key;
  };

  const fieldKey = getFieldKey(column);
  const value = getCellValue(column);

  if (column.key === 'endTime') {
    return (
      <td key={column.id} className="px-4 py-2">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value}
        </span>
      </td>
    );
  }

  if (column.key === 'notes' || column.isCustom) {
    return (
      <td key={column.id} className="px-4 py-2">
        <textarea
          ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
          value={value}
          onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
          onClick={() => onCellClick(item.id, fieldKey)}
          onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
          className="w-full border-none bg-transparent text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none"
          rows={1}
        />
      </td>
    );
  }

  return (
    <td key={column.id} className="px-4 py-2">
      <input
        ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
        type="text"
        value={value}
        onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
        onClick={() => onCellClick(item.id, fieldKey)}
        onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
        className={`w-full border-none bg-transparent text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm ${
          column.key === 'duration' || column.key === 'startTime' ? 'font-mono' : ''
        }`}
        placeholder={column.key === 'duration' || column.key === 'startTime' ? '00:00:00' : ''}
      />
    </td>
  );
};

export default CellRenderer;
