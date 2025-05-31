
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';
import ExpandableScriptCell from './ExpandableScriptCell';

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
    
    // Special handling for headers and segment name field
    if (column.key === 'segmentName') {
      // For headers, use segmentName or name field
      if (item.type === 'header') {
        return item.segmentName || item.name || '';
      }
      // For regular items, use segmentName or name
      return item.segmentName || item.name || '';
    }
    
    return (item as any)[column.key] || '';
  };

  // Use the column key for cell references and navigation
  const cellRefKey = column.key;
  // Use the proper field key for updates
  const updateFieldKey = column.isCustom ? `customFields.${column.key}` : column.key;

  const value = getCellValue(column);

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking on cells
    // Use cellRefKey for navigation
    onCellClick(item.id, cellRefKey);
  };

  const handleUpdateValue = (newValue: string) => {
    // Use updateFieldKey for actual updates
    onUpdateItem(item.id, updateFieldKey, newValue);
  };

  // Helper function to determine if content needs two lines
  const needsTwoLines = (text: string) => {
    // Rough estimation: if text is longer than ~40 characters, it might need two lines
    // This can be adjusted based on your typical column widths
    return text.length > 40 || text.includes('\n');
  };

  const shouldExpandRow = needsTwoLines(value);

  if (column.key === 'endTime' || column.key === 'startTime') {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          {value}
        </span>
      </td>
    );
  }

  if (column.key === 'script') {
    return (
      <td key={column.id} className="px-4 py-2" onClick={handleCellClick} style={{ width }}>
        <ExpandableScriptCell
          value={value}
          itemId={item.id}
          cellRefKey={cellRefKey}
          cellRefs={cellRefs}
          textColor={textColor}
          onUpdateValue={handleUpdateValue}
          onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  if (column.key === 'notes' || column.isCustom) {
    return (
      <td key={column.id} className="px-4 py-2 align-top" onClick={handleCellClick} style={{ width }}>
        <textarea
          ref={el => el && (cellRefs.current[`${item.id}-${cellRefKey}`] = el)}
          value={value}
          onChange={(e) => handleUpdateValue(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, item.id, cellRefKey)}
          className="w-full border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none overflow-hidden"
          style={{ 
            color: textColor || undefined,
            minHeight: '24px',
            height: shouldExpandRow ? '48px' : '24px'
          }}
          rows={shouldExpandRow ? 2 : 1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const scrollHeight = target.scrollHeight;
            // Dynamically adjust height based on content, max 2 lines
            target.style.height = Math.min(scrollHeight, 48) + 'px';
          }}
        />
      </td>
    );
  }

  return (
    <td key={column.id} className="px-4 py-2 align-top" onClick={handleCellClick} style={{ width }}>
      <textarea
        ref={el => el && (cellRefs.current[`${item.id}-${cellRefKey}`] = el)}
        value={value}
        onChange={(e) => handleUpdateValue(e.target.value)}
        onKeyDown={(e) => onKeyDown(e, item.id, cellRefKey)}
        className={`w-full border-none bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none overflow-hidden ${
          column.key === 'duration' ? 'font-mono' : ''
        }`}
        style={{ 
          color: textColor || undefined,
          minHeight: '24px',
          height: shouldExpandRow ? '48px' : '24px'
        }}
        rows={shouldExpandRow ? 2 : 1}
        placeholder={column.key === 'duration' ? '00:00:00' : ''}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          const scrollHeight = target.scrollHeight;
          // Dynamically adjust height based on content, max 2 lines
          target.style.height = Math.min(scrollHeight, 48) + 'px';
        }}
      />
    </td>
  );
};

export default CellRenderer;
