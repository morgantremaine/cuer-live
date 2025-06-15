
import React from 'react';
import TextAreaCell from './cells/TextAreaCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import CustomFieldCell from './cells/CustomFieldCell';
import ExpandableScriptCell from './ExpandableScriptCell';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface CellRendererProps {
  column: Column;
  item: RundownItem & {
    calculatedStartTime?: string;
    calculatedEndTime?: string;
    calculatedElapsedTime?: string;
    calculatedRowNumber?: string;
  };
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
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
  backgroundColor,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  width
}: CellRendererProps) => {
  // Get the current value for this cell
  const getCellValue = () => {
    if (column.isCustom) {
      const value = item.customFields?.[column.key] || '';
      console.log(`🎨 CellRenderer: Getting custom field value for "${column.key}": "${value}"`);
      return value;
    }
    
    switch (column.key) {
      case 'name':
        // For segment name column, always use item.name (the actual segment description)
        return item.name || '';
      case 'duration':
        return item.duration || '';
      case 'startTime':
        return item.calculatedStartTime || item.startTime || '';
      case 'endTime':
        return item.calculatedEndTime || item.endTime || '';
      case 'elapsedTime':
        return item.calculatedElapsedTime || item.elapsedTime || '';
      case 'talent':
        return item.talent || '';
      case 'script':
        return item.script || '';
      case 'notes':
        return item.notes || '';
      default:
        console.log(`🎨 CellRenderer: Unknown column key "${column.key}" for item ${item.id}`);
        return (item as any)[column.key] || '';
    }
  };

  const value = getCellValue();

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
        backgroundColor={backgroundColor} 
        textColor={textColor}
      />
    );
  }

  // Create cell key for referencing
  const cellKey = `${item.id}-${column.key}`;

  // Use CustomFieldCell for custom fields
  if (column.isCustom) {
    return (
      <CustomFieldCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={textColor}
        backgroundColor={backgroundColor}
        onUpdateValue={(newValue) => {
          const field = `customFields.${column.key}`;
          console.log(`🎨 CellRenderer: Updating custom field "${field}" for item ${item.id} to: "${newValue}"`);
          onUpdateItem(item.id, field, newValue);
        }}
        onCellClick={(e) => onCellClick(item.id, column.key)}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Use ExpandableScriptCell for script and notes fields (both built-in columns)
  if (column.key === 'script' || column.key === 'notes') {
    return (
      <ExpandableScriptCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={textColor}
        onUpdateValue={(newValue) => {
          console.log(`🎨 CellRenderer: Updating ${column.key} for item ${item.id} to: "${newValue}"`);
          onUpdateItem(item.id, column.key, newValue);
        }}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Use TextAreaCell for all other editable fields to ensure consistent navigation
  return (
    <TextAreaCell
      value={value}
      itemId={item.id}
      cellRefKey={column.key}
      cellRefs={cellRefs}
      textColor={textColor}
      backgroundColor={backgroundColor}
      isDuration={column.key === 'duration'}
      onUpdateValue={(newValue) => {
        console.log(`🎨 CellRenderer: Updating ${column.key} for item ${item.id} to: "${newValue}"`);
        onUpdateItem(item.id, column.key, newValue);
      }}
      onCellClick={(e) => onCellClick(item.id, column.key)}
      onKeyDown={onKeyDown}
    />
  );
};

export default CellRenderer;
