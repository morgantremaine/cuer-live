
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
  backgroundColor?: string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width: string;
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
  const cellKey = `${item.id}-${column.key}`;
  const isHeader = item.type === 'header';
  
  // For header name/segmentName cells, use larger text
  const isHeaderNameCell = isHeader && (column.key === 'segmentName' || column.key === 'name');

  // Handle time-related columns
  if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
    return (
      <TimeDisplayCell
        value={(item as any)[column.key] || ''}
        textColor={textColor}
        backgroundColor={backgroundColor}
        width={width}
      />
    );
  }

  // Handle multi-line fields
  if (column.key === 'script' || column.key === 'notes' || column.key === 'description') {
    return (
      <TextAreaCell
        key={cellKey}
        column={column}
        item={item}
        cellRefs={cellRefs}
        textColor={textColor}
        backgroundColor={backgroundColor}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        width={width}
        className={isHeaderNameCell ? "text-xl font-bold" : undefined}
      />
    );
  }

  // Handle all other fields
  return (
    <CustomFieldCell
      key={cellKey}
      column={column}
      item={item}
      cellRefs={cellRefs}
      textColor={textColor}
      backgroundColor={backgroundColor}
      onUpdateItem={onUpdateItem}
      onCellClick={onCellClick}
      onKeyDown={onKeyDown}
      width={width}
      className={isHeaderNameCell ? "text-xl font-bold" : undefined}
    />
  );
};

export default CellRenderer;
