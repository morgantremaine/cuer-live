
import React from 'react';
import ExpandableScriptCell from '../ExpandableScriptCell';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface TextAreaCellProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width: string;
  className?: string;
}

const TextAreaCell = ({
  column,
  item,
  cellRefs,
  textColor,
  backgroundColor,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  width,
  className
}: TextAreaCellProps) => {
  const cellKey = `${item.id}-${column.key}`;
  const value = (item as any)[column.key] || '';

  // Use expandable script cell for script column
  if (column.key === 'script') {
    return (
      <ExpandableScriptCell
        value={value}
        onChange={(newValue) => onUpdateItem(item.id, column.key, newValue)}
        onClick={() => onCellClick(item.id, column.key)}
        onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
        textColor={textColor}
        backgroundColor={backgroundColor}
        width={width}
        className={className}
      />
    );
  }

  return (
    <div className="px-2 py-1" style={{ width }}>
      <textarea
        ref={(el) => {
          if (el) cellRefs.current[cellKey] = el;
        }}
        value={value}
        onChange={(e) => onUpdateItem(item.id, column.key, e.target.value)}
        onClick={() => onCellClick(item.id, column.key)}
        onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
        className={`w-full bg-transparent border-none outline-none resize-none text-sm ${className || ''}`}
        style={{ 
          color: textColor,
          minHeight: '1.5rem'
        }}
        rows={1}
      />
    </div>
  );
};

export default TextAreaCell;
