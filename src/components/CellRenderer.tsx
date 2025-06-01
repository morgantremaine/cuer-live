
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';
import { SearchHighlight } from '@/types/search';
import TimeCell from './cells/TimeCell';
import ElementCell from './cells/ElementCell';
import ScriptNotesCell from './cells/ScriptNotesCell';
import CustomFieldCell from './cells/CustomFieldCell';
import StandardCell from './cells/StandardCell';

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
    return (item as any)[column.key] || '';
  };

  // Use the column key for cell references and navigation
  const cellRefKey = column.key;
  // Use the full path for updates
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
    e.stopPropagation();
    onCellClick(item.id, cellRefKey);
  };

  const handleUpdateValue = (newValue: string) => {
    onUpdateItem(item.id, updateFieldKey, newValue);
  };

  // Time display cells (read-only)
  if (column.key === 'endTime' || column.key === 'startTime') {
    return (
      <TimeCell
        value={value}
        highlight={highlight}
        width={width}
      />
    );
  }

  // Element input cell
  if (column.key === 'element') {
    return (
      <ElementCell
        value={value}
        itemId={item.id}
        cellRefKey={cellRefKey}
        cellRefs={cellRefs}
        textColor={textColor}
        onUpdateValue={handleUpdateValue}
        onCellClick={handleCellClick}
        onKeyDown={onKeyDown}
        width={width}
      />
    );
  }

  // Script and notes cells (expandable)
  if (column.key === 'script' || column.key === 'notes') {
    return (
      <ScriptNotesCell
        value={value}
        itemId={item.id}
        cellRefKey={cellRefKey}
        cellRefs={cellRefs}
        textColor={textColor}
        currentHighlight={highlight}
        onUpdateValue={handleUpdateValue}
        onCellClick={handleCellClick}
        onKeyDown={onKeyDown}
        width={width}
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
        width={width}
      />
    );
  }

  // Standard cells (duration, talent, etc.)
  return (
    <StandardCell
      value={value}
      itemId={item.id}
      cellRefKey={cellRefKey}
      cellRefs={cellRefs}
      textColor={textColor}
      highlight={highlight}
      columnKey={column.key}
      onUpdateValue={handleUpdateValue}
      onCellClick={handleCellClick}
      onKeyDown={onKeyDown}
      width={width}
    />
  );
};

export default CellRenderer;
