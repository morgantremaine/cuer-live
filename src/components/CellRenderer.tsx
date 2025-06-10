
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
        return item.calculatedStartTime || item.startTime || '';
      case 'endTime':
        return item.calculatedEndTime || item.endTime || '';
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
  console.log(`📝 Cell value for ${item.id}.${column.key}:`, value);

  // Determine if this is a read-only field
  const isReadOnly = !column.isEditable || 
    column.key === 'startTime' || 
    column.key === 'endTime' || 
    column.key === 'elapsedTime';

  // Use TimeDisplayCell for calculated time fields
  if (isReadOnly && (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime')) {
    return (
      <TimeDisplayCell
        value={value}
        textColor={textColor}
        width={width}
      />
    );
  }

  // Use CustomFieldCell for custom fields
  if (column.isCustom) {
    return (
      <CustomFieldCell
        column={column}
        item={item}
        value={value}
        cellRefs={cellRefs}
        textColor={textColor}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        width={width}
      />
    );
  }

  // Use TextAreaCell for script and notes fields
  if (column.key === 'script' || column.key === 'notes') {
    return (
      <TextAreaCell
        column={column}
        item={item}
        value={value}
        cellRefs={cellRefs}
        textColor={textColor}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        width={width}
      />
    );
  }

  // Default input cell for other fields
  const cellKey = `${item.id}-${column.key}`;
  
  return (
    <div className="p-1" style={{ width }}>
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
        className="w-full px-1 py-0.5 text-sm border-none bg-transparent outline-none resize-none"
        style={{ color: textColor }}
        placeholder={`Enter ${column.name.toLowerCase()}...`}
      />
    </div>
  );
};

export default CellRenderer;
