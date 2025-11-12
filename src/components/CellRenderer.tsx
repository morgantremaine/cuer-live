
import React from 'react';
import TextAreaCell from './cells/TextAreaCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import ImageCell from './cells/ImageCell';
import ExpandableScriptCell from './ExpandableScriptCell';
import { CellEditorIndicator } from './cells/CellEditorIndicator';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';

interface CellRendererProps {
  column: Column;
  item: RundownItem & {
    calculatedStartTime?: string;
    calculatedEndTime?: string;
    calculatedElapsedTime?: string;
    calculatedRowNumber?: string;
    calculatedBackTime?: string;
  };
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  columnExpandState?: { [columnKey: string]: boolean };
  expandedCells?: Set<string>;
  onToggleCellExpanded?: (itemId: string, columnKey: string) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  markActiveTyping?: () => void;
  width?: string;
  activeEditor?: { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
  onScrollToEditor?: (itemId: string) => void;
}

const CellRenderer = ({
  column,
  item,
  cellRefs,
  textColor,
  backgroundColor,
  currentSegmentId,
  columnExpandState = {},
  expandedCells,
  onToggleCellExpanded,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  markActiveTyping,
  width,
  activeEditor,
  onCellFocus,
  onCellBlur,
  onScrollToEditor
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
      case 'backTime':
        return item.calculatedBackTime || '';
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
    column.key === 'elapsedTime' ||
    column.key === 'backTime';

  // Check if this is the current segment and segment name column for showcaller highlighting
  const isCurrentSegmentName = currentSegmentId === item.id && 
    (column.key === 'segmentName' || column.key === 'name');

  // Override colors for showcaller highlighting
  const showcallerBackgroundColor = isCurrentSegmentName ? '#3b82f6' : backgroundColor; // bright blue
  const showcallerTextColor = isCurrentSegmentName ? '#ffffff' : textColor; // white text

  // Elapsed time is a duration, not time-of-day, so render it directly
  if (column.key === 'elapsedTime') {
    return (
      <div className="w-full h-full p-1" style={{ backgroundColor: showcallerBackgroundColor }}>
        <span 
          className="inline-block w-full text-sm font-mono px-1 py-1 rounded-sm text-center border-0"
          style={{ color: showcallerTextColor || 'inherit' }}
        >
          {value || '00:00:00'}
        </span>
      </div>
    );
  }

  // Use TimeDisplayCell for time-of-day fields (startTime, endTime, backTime)
  if (isReadOnly && (column.key === 'startTime' || column.key === 'endTime' || column.key === 'backTime')) {
    return (
      <TimeDisplayCell 
        value={value} 
        backgroundColor={showcallerBackgroundColor} 
        textColor={showcallerTextColor}
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
        textColor={showcallerTextColor}
        backgroundColor={showcallerBackgroundColor}
        onUpdateValue={(newValue) => {
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
    const cellKey = `${item.id}-${column.key}`;
    const isCellExpanded = expandedCells?.has(cellKey);
    
    const cellContent = (
      <ExpandableScriptCell
        value={value}
        itemId={item.id}
        cellRefKey={column.key}
        cellRefs={cellRefs}
        textColor={showcallerTextColor}
        columnExpanded={columnExpandState[column.key]}
        fieldType={column.key as 'script' | 'notes'}
        isExpanded={isCellExpanded}
        onToggleExpanded={onToggleCellExpanded ? () => onToggleCellExpanded(item.id, column.key) : undefined}
        onUpdateValue={(newValue) => {
          onUpdateItem(item.id, column.key, newValue);
        }}
        onKeyDown={onKeyDown}
        onCellFocus={onCellFocus ? () => onCellFocus(item.id, column.key) : undefined}
        onCellBlur={onCellBlur ? () => onCellBlur(item.id, column.key) : undefined}
      />
    );

    // Wrap with editor indicator if someone else is editing
    if (activeEditor) {
      console.log('🎨 Rendering with activeEditor:', { itemId: item.id, field: column.key, userName: activeEditor.userName });
      return (
        <CellEditorIndicator 
          userName={activeEditor.userName} 
          userId={activeEditor.userId}
          itemId={item.id}
          onScrollToCell={onScrollToEditor}
        >
          {cellContent}
        </CellEditorIndicator>
      );
    }

    return cellContent;
  }

  // Check if this is a time-related field that should be centered
  const isTimeField = column.key === 'duration' || column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime' || column.key === 'backTime';

  // Use TextAreaCell for ALL other editable fields (built-in AND custom) to ensure consistent behavior
  const cellContent = (
    <TextAreaCell
      value={value}
      itemId={item.id}
      cellRefKey={column.key}
      cellRefs={cellRefs}
      textColor={textColor}
      backgroundColor={backgroundColor}
      isDuration={isTimeField}
      fieldKeyForProtection={column.isCustom ? `customFields.${column.key}` : ((column.key === 'segmentName' || column.key === 'name') ? 'name' : column.key)}
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
      onCellFocus={onCellFocus ? () => onCellFocus(item.id, column.key) : undefined}
      onCellBlur={onCellBlur ? () => onCellBlur(item.id, column.key) : undefined}
    />
  );

  // Wrap with editor indicator if someone else is editing
  if (activeEditor) {
    console.log('🎨 Rendering with activeEditor:', { itemId: item.id, field: column.key, userName: activeEditor.userName });
    return (
      <CellEditorIndicator 
        userName={activeEditor.userName} 
        userId={activeEditor.userId}
        itemId={item.id}
        onScrollToCell={onScrollToEditor}
      >
        {cellContent}
      </CellEditorIndicator>
    );
  }

  return cellContent;
};

export default CellRenderer;
