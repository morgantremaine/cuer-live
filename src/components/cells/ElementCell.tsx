
import React from 'react';

interface ElementCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width?: string;
}

const ElementCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  onUpdateValue,
  onCellClick,
  onKeyDown,
  width
}: ElementCellProps) => {
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

  return (
    <td className="px-1 py-1 align-middle" onClick={onCellClick} style={{ width }}>
      <div className="flex items-center justify-start h-full min-h-[28px]">
        <input
          ref={el => el && (cellRefs.current[`${itemId}-${cellRefKey}`] = el)}
          type="text"
          value={value}
          onChange={(e) => onUpdateValue(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, itemId, cellRefKey)}
          className={`w-full text-sm bg-gray-100 dark:bg-gray-600 px-1 py-0.5 rounded text-gray-900 dark:text-gray-100 border-none ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400`}
          style={{ 
            // Only apply textColor in light mode, let dark mode classes handle dark mode
            color: document.documentElement.classList.contains('dark') ? undefined : (textColor || undefined)
          }}
        />
      </div>
    </td>
  );
};

export default ElementCell;
