
import React from 'react';
import HighlightedText from '../HighlightedText';
import { useCellAutoResize } from './useCellAutoResize';

interface TextareaCellProps {
  columnId: string;
  columnKey: string;
  value: string;
  width?: string;
  textColor?: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  focusStyles: string;
  placeholder?: string;
  isMonospace?: boolean;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  onCellClick: (e: React.MouseEvent) => void;
  onUpdateValue: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const TextareaCell = ({
  columnId,
  columnKey,
  value,
  width,
  textColor,
  itemId,
  cellRefKey,
  cellRefs,
  focusStyles,
  placeholder,
  isMonospace = false,
  highlight,
  onCellClick,
  onUpdateValue,
  onKeyDown
}: TextareaCellProps) => {
  const { autoResize } = useCellAutoResize();

  return (
    <td key={columnId} className="px-4 py-2 align-top" onClick={onCellClick} style={{ width }}>
      <div className="relative">
        <textarea
          ref={el => {
            if (el) {
              cellRefs.current[`${itemId}-${cellRefKey}`] = el;
              // Initialize height based on current content
              autoResize(el);
            }
          }}
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            onUpdateValue(newValue);
            autoResize(e.target, newValue);
          }}
          onKeyDown={(e) => onKeyDown(e, itemId, cellRefKey)}
          className={`w-full border-none bg-transparent ${focusStyles} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-400 rounded px-2 py-1 text-sm resize-none overflow-hidden ${
            isMonospace ? 'font-mono' : ''
          }`}
          style={{ 
            color: textColor || undefined,
            minHeight: '24px'
          }}
          placeholder={placeholder}
          onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
        />
        {highlight && (
          <div className="absolute inset-0 pointer-events-none px-2 py-1 text-sm" style={{ color: 'transparent' }}>
            <HighlightedText text={value} highlight={highlight} />
          </div>
        )}
      </div>
    </td>
  );
};

export default TextareaCell;
