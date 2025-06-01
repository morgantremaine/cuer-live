
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { SearchHighlight } from '@/types/search';
import ExpandableScriptCell from './ExpandableScriptCell';
import HighlightedText from './HighlightedText';

interface CellRendererProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  currentHighlight?: SearchHighlight | null;
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
  currentHighlight,
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

  // Use the column key for cell references and navigation
  const cellRefKey = column.key;
  // Use the full path for updates
  const updateFieldKey = column.isCustom ? `customFields.${column.key}` : column.key;

  const value = getCellValue(column);

  // Check if this cell should be highlighted
  const shouldHighlight = currentHighlight && 
    currentHighlight.itemId === item.id && 
    currentHighlight.field === cellRefKey;

  const highlight = shouldHighlight ? {
    startIndex: currentHighlight.startIndex,
    endIndex: currentHighlight.endIndex
  } : null;

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

  // Get the appropriate focus styles for colored rows in dark mode
  const getFocusStyles = () => {
    // Check if textColor is set (indicating a colored row)
    const hasCustomColor = textColor && textColor !== '';
    
    if (hasCustomColor) {
      // For colored rows, force white text on focus in dark mode and black in light mode
      return 'focus:bg-white dark:focus:bg-gray-800 focus:!text-gray-900 dark:focus:!text-white';
    } else {
      // For normal rows, use standard focus styles
      return 'focus:bg-white dark:focus:bg-gray-700';
    }
  };

  const focusStyles = getFocusStyles();

  if (column.key === 'endTime' || column.key === 'startTime') {
    return (
      <td key={column.id} className="px-1 py-1" onClick={handleCellClick} style={{ width }}>
        <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-gray-900 dark:text-gray-100">
          <HighlightedText text={value} highlight={highlight} />
        </span>
      </td>
    );
  }

  if (column.key === 'script' || column.key === 'notes') {
    return (
      <td key={column.id} className="px-1 py-1" onClick={handleCellClick} style={{ width }}>
        <ExpandableScriptCell
          value={value}
          itemId={item.id}
          cellRefKey={cellRefKey}
          cellRefs={cellRefs}
          textColor={textColor}
          currentHighlight={highlight}
          onUpdateValue={handleUpdateValue}
          onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  if (column.isCustom) {
    return (
      <td key={column.id} className="px-1 py-1 align-top" onClick={handleCellClick} style={{ width }}>
        <div className="relative">
          <textarea
            ref={el => el && (cellRefs.current[`${item.id}-${cellRefKey}`] = el)}
            value={value}
            onChange={(e) => handleUpdateValue(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, item.id, cellRefKey)}
            className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-1 py-0.5 text-sm resize-none overflow-hidden`}
            style={{ 
              color: textColor || undefined,
              minHeight: '20px',
              height: shouldExpandRow ? '40px' : '20px'
            }}
            rows={shouldExpandRow ? 2 : 1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              const scrollHeight = target.scrollHeight;
              // Dynamically adjust height based on content, max 2 lines
              target.style.height = Math.min(scrollHeight, 40) + 'px';
            }}
          />
          {highlight && (
            <div className="absolute inset-0 pointer-events-none px-1 py-0.5 text-sm" style={{ color: 'transparent' }}>
              <HighlightedText text={value} highlight={highlight} />
            </div>
          )}
        </div>
      </td>
    );
  }

  return (
    <td key={column.id} className="px-1 py-1 align-top" onClick={handleCellClick} style={{ width }}>
      <div className="relative">
        <textarea
          ref={el => el && (cellRefs.current[`${item.id}-${cellRefKey}`] = el)}
          value={value}
          onChange={(e) => handleUpdateValue(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, item.id, cellRefKey)}
          className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-1 py-0.5 text-sm resize-none overflow-hidden ${
            column.key === 'duration' ? 'font-mono' : ''
          }`}
          style={{ 
            color: textColor || undefined,
            minHeight: '20px',
            height: shouldExpandRow ? '40px' : '20px'
          }}
          rows={shouldExpandRow ? 2 : 1}
          placeholder={column.key === 'duration' ? '00:00:00' : ''}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            const scrollHeight = target.scrollHeight;
            // Dynamically adjust height based on content, max 2 lines
            target.style.height = Math.min(scrollHeight, 40) + 'px';
          }}
        />
        {highlight && (
          <div className="absolute inset-0 pointer-events-none px-1 py-0.5 text-sm" style={{ color: 'transparent' }}>
            <HighlightedText text={value} highlight={highlight} />
          </div>
        )}
      </div>
    </td>
  );
};

export default CellRenderer;
