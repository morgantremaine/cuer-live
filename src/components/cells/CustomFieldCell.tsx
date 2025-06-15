
import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface CustomFieldCellProps {
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

const CustomFieldCell = ({
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
}: CustomFieldCellProps) => {
  const cellKey = `${item.id}-${column.key}`;
  const value = (item as any)[column.key] || '';

  return (
    <div className="px-2 py-1" style={{ width }}>
      <input
        ref={(el) => {
          if (el) cellRefs.current[cellKey] = el;
        }}
        type="text"
        value={value}
        onChange={(e) => onUpdateItem(item.id, column.key, e.target.value)}
        onClick={() => onCellClick(item.id, column.key)}
        onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
        className={`w-full bg-transparent border-none outline-none text-sm ${className || ''}`}
        style={{ color: textColor }}
      />
    </div>
  );
};

export default CustomFieldCell;
