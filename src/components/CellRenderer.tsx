
import React from 'react';
import TextAreaCell from './cells/TextAreaCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import ImageCell from './cells/ImageCell';
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
      return item.customFields?.[column.key] || '';
    }
    
    switch (column.key) {
      case 'segmentName':
        // For segment name column, always use item.name (the actual segment description)
        return item.name || '';
      case 'name':
        // Also handle 'name' key directly
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
      case 'gfx':
        return item.gfx || '';
      case 'video':
        return item.video || '';
      case 'images':
        // Explicitly handle images column
        return item.images || '';
      default:
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

  // Use ImageCell for images column - check both column.key and column.id
  if (column.key === 'images' || column.id === 'images') {
    return (
      <ImageCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={textColor}
        backgroundColor={backgroundColor}
        onUpdateValue={(newValue) => {
          console.log('🖼️ ImageCell updating value:', newValue, 'for item:', item.id);
          // Always use 'images' as the field name for the images column
          onUpdateItem(item.id, 'images', newValue);
        }}
        onCellClick={(e) => {
          onCellClick(item.id, column.key);
        }}
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
          onUpdateItem(item.id, column.key, newValue);
        }}
        onKeyDown={onKeyDown}
      />
    );
  }

  // Use TextAreaCell for ALL other editable fields (built-in AND custom) to ensure consistent behavior
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
        // Handle custom fields vs built-in fields
        if (column.isCustom) {
          const field = `customFields.${column.key}`;
          onUpdateItem(item.id, field, newValue);
        } else {
          // For segmentName column, always update the 'name' field
          // For name column, also update the 'name' field
          const field = (column.key === 'segmentName' || column.key === 'name') ? 'name' : column.key;
          onUpdateItem(item.id, field, newValue);
        }
      }}
      onCellClick={(e) => onCellClick(item.id, column.key)}
      onKeyDown={onKeyDown}
    />
  );
};

export default CellRenderer;
