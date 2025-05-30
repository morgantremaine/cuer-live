
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/hooks/useRundownItems';
import { ClockFormat } from '@/hooks/useClockFormat';

interface CellRendererProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  clockFormat: ClockFormat;
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
  clockFormat,
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

  const formatTimeDisplay = (timeString: string) => {
    if (!timeString || timeString === '00:00:00') return timeString;
    
    if (clockFormat === '12') {
      const [hours, minutes, seconds] = timeString.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    }
    
    return timeString;
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

  if (column.key === 'endTime') {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <span 
          className="text-sm font-mono"
          style={{ color: textColor || undefined }}
        >
          {formatTimeDisplay(value)}
        </span>
      </td>
    );
  }

  if (column.key === 'startTime') {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <input
          ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
          type="text"
          value={formatTimeDisplay(value)}
          onChange={(e) => {
            // Convert back to 24-hour format for storage
            let timeValue = e.target.value;
            if (clockFormat === '12' && timeValue.includes(' ')) {
              const [time, ampm] = timeValue.split(' ');
              const [hours, minutes, seconds] = time.split(':');
              let hour24 = parseInt(hours, 10);
              if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
              if (ampm === 'AM' && hour24 === 12) hour24 = 0;
              timeValue = `${hour24.toString().padStart(2, '0')}:${minutes}:${seconds}`;
            }
            onUpdateItem(item.id, fieldKey, timeValue);
          }}
          onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
          className="w-full border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm font-mono"
          style={{ color: textColor || undefined }}
          placeholder={clockFormat === '12' ? '12:00:00 AM' : '00:00:00'}
        />
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
          column.key === 'duration' || column.key === 'startTime' ? 'font-mono' : ''
        }`}
        style={{ color: textColor || undefined }}
        placeholder={column.key === 'duration' || column.key === 'startTime' ? '00:00:00' : ''}
      />
    </td>
  );
};

export default CellRenderer;
