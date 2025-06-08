
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
  // Helper function to determine if content needs two lines
  const needsTwoLines = (text: string) => {
    return text.length > 40 || text.includes('\n');
  };

  const shouldExpandRow = needsTwoLines(value);

  // Get the appropriate focus styles for colored rows in dark mode
  const getFocusStyles = () => {
    const hasCustomColor = textColor && textColor !== '';
    
    if (hasCustomColor) {
      return 'focus:bg-white dark:focus:bg-gray-800 focus:!text-gray-900 dark:focus:!text-white';
    } else {
      return 'focus:bg-white dark:focus:bg-gray-700';
    }
  };

  const focusStyles = getFocusStyles();

  // Handle key navigation - allow Enter to navigate to next cell, arrows for navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // For Enter key, navigate to next cell
    if (e.key === 'Enter') {
      e.preventDefault();
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // For Up/Down arrows, navigate to cells above/below
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyDown(e, itemId, cellRefKey);
      return;
    }
    
    // Allow other keys to work normally (Left/Right arrows, typing, etc.)
  };

  // Create the proper cell ref key
  const cellKey = `${itemId}-${cellRefKey}`;

  return (
    <div className="relative flex items-center min-h-[28px]">
      <textarea
        ref={el => {
          if (el) {
            cellRefs.current[cellKey] = el;
            console.log('Storing cell ref:', cellKey);
          }
        }}
        value={value}
        onChange={(e) => onUpdateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={onCellClick}
        className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-1 py-0.5 text-sm resize-none overflow-hidden leading-tight`}
        style={{ 
          color: textColor || undefined,
          minHeight: '20px',
          height: shouldExpandRow ? '40px' : '20px',
          lineHeight: '1.2'
        }}
        rows={shouldExpandRow ? 2 : 1}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          const scrollHeight = target.scrollHeight;
          target.style.height = Math.min(scrollHeight, 40) + 'px';
        }}
      />
      {highlight && (
        <div className="absolute inset-0 pointer-events-none px-1 py-0.5 text-sm flex items-center" style={{ color: 'transparent' }}>
          <HighlightedText text={value} highlight={highlight} />
        </div>
      )}
    </div>
  );
};

export default CustomFieldCell;
