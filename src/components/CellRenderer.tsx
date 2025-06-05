
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { SearchHighlight } from '@/types/search';
import ExpandableScriptCell from './ExpandableScriptCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import TextAreaCell from './cells/TextAreaCell';
import CustomFieldCell from './cells/CustomFieldCell';

interface CellRendererProps {
  column: Column;
  item: RundownItem;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  currentHighlight?: SearchHighlight | null;
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
  currentHighlight,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  width
}: CellRendererProps) => {
  const getCellValue = (column: Column) => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    
    // Special handling for duration column - default to '00:00' if empty or if it's '00:00:00'
    if (column.key === 'duration') {
      const durationValue = (item as any)[column.key] || '';
      if (durationValue === '' || durationValue === '00:00:00') {
        return '00:00';
      }
      return durationValue;
    }
    
    return (item as any)[column.key] || '';
  };

  // Use the column key for cell references and navigation
  const cellRefKey = column.key;
  // Use the correct field path for updates - custom fields need the customFields prefix
  const updateFieldKey = column.isCustom ? `customFields.${column.key}` : column.key;

  const value = getCellValue(column);

  // Check if this cell should be highlighted
  const shouldHighlight = currentHighlight && 
    currentHighlight.itemId === item.id && 
    currentHighlight.field === cellRefKey;

  const highlight = shouldHighlight ? {
    startIndex: currentHighlight.startIndex,
    endIndex: currentHighlight.endIndex
  } : null;

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection when clicking on cells
    // Use cellRefKey for navigation
    onCellClick(item.id, cellRefKey);
  };

  const handleUpdateValue = (newValue: string) => {
    // Use updateFieldKey for actual updates
    onUpdateItem(item.id, updateFieldKey, newValue);
  };

  // Time display cells (non-editable)
  if (column.key === 'endTime' || column.key === 'startTime' || column.key === 'elapsedTime') {
    return <TimeDisplayCell value={value} highlight={highlight} />;
  }

  // Expandable script and notes cells
  if (column.key === 'script' || column.key === 'notes') {
    return (
      <ExpandableScriptCell
        value={value}
        itemId={item.id}
        cellRefKey={cellRefKey}
        cellRefs={cellRefs}
        textColor={textColor}
        currentHighlight={highlight}
        onUpdateValue={handleUpdateValue}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Custom field cells
  if (column.isCustom) {
    return (
      <CustomFieldCell
        value={value}
        itemId={item.id}
        cellRefKey={cellRefKey}
        cellRefs={cellRefs}
        textColor={textColor}
        highlight={highlight}
        onUpdateValue={handleUpdateValue}
        onCellClick={handleCellClick}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Regular text area cells
  return (
    <TextAreaCell
      value={value}
      itemId={item.id}
      cellRefKey={cellRefKey}
      cellRefs={cellRefs}
      textColor={textColor}
      isDuration={column.key === 'duration'}
      placeholder={column.key === 'duration' ? '00:00:00' : ''}
      highlight={highlight}
      onUpdateValue={handleUpdateValue}
      onCellClick={handleCellClick}
      onKeyDown={onKeyDown}
    />
  );
};

export default CellRenderer;
