
import React from 'react';
import HighlightedText from '../HighlightedText';

interface CustomFieldCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const CustomFieldCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  highlight,
  onUpdateValue,
  onCellClick,
  onKeyDown
}: CustomFieldCellProps) => {
  // Simple key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Enter key and arrow keys, navigate to next/previous cell
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // Allow other keys to work normally
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  return (
    <div className="w-full h-full p-1">
      <textarea
        ref={el => {
          if (el) {
            cellRefs.current[cellKey] = el;
          } else {
            delete cellRefs.current[cellKey];
          }
        }}
        value={value}
        onChange={(e) => onUpdateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={onCellClick}
        data-cell-id={cellKey}
        data-cell-ref={cellKey}
        className="w-full h-full px-2 py-1 text-sm bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 rounded-sm resize-none"
        style={{ 
          color: textColor || '#374151',
          minHeight: '28px'
        }}
        rows={1}
        placeholder="Enter value..."
      />
    </div>
  );
};

export default CustomFieldCell;
