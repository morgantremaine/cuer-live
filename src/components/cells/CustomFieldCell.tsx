
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown(e, itemId, cellRefKey);
  };

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

  return (
    <div className="relative w-full">
      <input
        ref={el => {
          if (el) {
            cellRefs.current[`${itemId}-${cellRefKey}`] = el;
          }
        }}
        type="text"
        value={value}
        onChange={(e) => onUpdateValue(e.target.value)}
        onClick={onCellClick}
        onKeyDown={handleKeyDown}
        className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm`}
        style={{ color: textColor || undefined }}
      />
      {highlight && (
        <div className="absolute inset-0 pointer-events-none px-2 py-1 text-sm" style={{ color: 'transparent' }}>
          <HighlightedText text={value} highlight={highlight} />
        </div>
      )}
    </div>
  );
};

export default CustomFieldCell;
