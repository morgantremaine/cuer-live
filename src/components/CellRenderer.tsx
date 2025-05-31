
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/hooks/useRundownItems';

interface CellRendererProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width?: string;
}

const CellRenderer = ({
  column,
  item,
  cellRefs,
  textColor,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  width
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

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking on cells
    onCellClick(item.id, fieldKey);
  };

  if (column.key === 'endTime' || column.key === 'startTime') {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <span 
          className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
          style={{ color: textColor || undefined }}
        >
          {value}
        </span>
      </td>
    );
  }

  if (column.key === 'notes' || column.isCustom) {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <textarea
          ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
          value={value}
          onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
          className="w-full border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none"
          style={{ color: textColor || undefined }}
          rows={1}
        />
      </td>
    );
  }

  return (
    <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
      <input
        ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
        type="text"
        value={value}
        onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
        className={`w-full border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm ${
          column.key === 'duration' ? 'font-mono' : ''
        }`}
        style={{ color: textColor || undefined }}
        placeholder={column.key === 'duration' ? '00:00:00' : ''}
      />
    </td>
  );
};

export default CellRenderer;
