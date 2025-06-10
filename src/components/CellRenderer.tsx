
import React from 'react';
import TextAreaCell from './cells/TextAreaCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import CustomFieldCell from './cells/CustomFieldCell';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

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
  // Get the current value for this cell
  const getCellValue = () => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    
    switch (column.key) {
      case 'segmentName':
        return item.segmentName || item.name || '';
      case 'duration':
        return item.duration || '';
      case 'startTime':
        return item.startTime || '';
      case 'endTime':
        return item.endTime || '';
      case 'talent':
        return item.talent || '';
      case 'script':
        return item.script || '';
      case 'notes':
        return item.notes || '';
      case 'gfx':
        return item.gfx || '';
      case 'video':
        return item.video || '';
      default:
        return (item as any)[column.key] || '';
    }
  };

  const value = getCellValue();
  console.log(`📝 CellRenderer for ${item.id}.${column.key}:`, value);

  // Determine if this is a read-only field
  const isReadOnly = !column.isEditable || 
    column.key === 'startTime' || 
    column.key === 'endTime' || 
    column.key === 'elapsedTime';

  // Use TimeDisplayCell for calculated time fields
  if (isReadOnly && (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime')) {
    console.log(`📝 Using TimeDisplayCell for ${column.key}`);
    return (
      <TimeDisplayCell
        value={value}
      />
    );
  }

  // Create cell key for referencing
  const cellKey = `${item.id}-${column.key}`;

  // Use CustomFieldCell for custom fields
  if (column.isCustom) {
    console.log(`📝 Using CustomFieldCell for ${column.key}`);
    return (
      <CustomFieldCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={textColor}
        onUpdateValue={(newValue) => {
          const field = `customFields.${column.key}`;
          onUpdateItem(item.id, field, newValue);
        }}
        onCellClick={(e) => onCellClick(item.id, column.key)}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Use TextAreaCell for script and notes fields
  if (column.key === 'script' || column.key === 'notes') {
    console.log(`📝 Using TextAreaCell for ${column.key}`);
    return (
      <TextAreaCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={textColor}
        placeholder={`Enter ${column.name.toLowerCase()}...`}
        onUpdateValue={(newValue) => {
          onUpdateItem(item.id, column.key, newValue);
        }}
        onCellClick={(e) => onCellClick(item.id, column.key)}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Default input cell for other fields - return only the input element with proper styling
  console.log(`📝 Using default input for ${column.key}`);
  return (
    <div className="flex items-center min-h-[28px] w-full h-full">
      <input
        ref={(el) => {
          if (el) {
            cellRefs.current[cellKey] = el;
          }
        }}
        type="text"
        value={value}
        onChange={(e) => {
          const field = column.isCustom ? `customFields.${column.key}` : column.key;
          onUpdateItem(item.id, field, e.target.value);
        }}
        onClick={() => onCellClick(item.id, column.key)}
        onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
        className="w-full px-1 py-0.5 text-sm border-none bg-transparent outline-none focus:bg-white dark:focus:bg-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-400 rounded"
        style={{ color: textColor }}
        placeholder={`Enter ${column.name.toLowerCase()}...`}
      />
    </div>
  );
};

export default CellRenderer;
