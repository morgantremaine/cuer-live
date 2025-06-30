
import React, { memo, useCallback } from 'react';
import { CustomFieldCell } from './cells/CustomFieldCell';
import ImageCell from './cells/ImageCell';
import { TextAreaCell } from './cells/TextAreaCell';
import TimeDisplayCell from './cells/TimeDisplayCell';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface CellRendererProps {
  item: RundownItem;
  column: Column;
  onUpdate?: (field: string, value: any) => void;
  onUserTyping?: (typing: boolean) => void;
  isSelected?: boolean;
  className?: string;
  // Legacy props that might be passed from existing row components
  cellRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  onCellClick?: (itemId: string, field: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width?: string;
  // Support both onUpdate and onUpdateItem for compatibility
  onUpdateItem?: (id: string, field: string, value: any) => void;
}

// Memoized cell renderer for better performance
const CellRenderer = memo(({ 
  item, 
  column, 
  onUpdate, 
  onUpdateItem,
  onUserTyping,
  isSelected = false,
  className = '',
  // Legacy props - we'll ignore these for now but accept them to prevent errors
  cellRefs,
  textColor,
  backgroundColor,
  currentSegmentId,
  onCellClick,
  onKeyDown,
  width
}: CellRendererProps) => {
  // Memoized update handler that supports both interfaces
  const handleUpdate = useCallback((value: any) => {
    if (onUpdate) {
      onUpdate(column.key, value);
    } else if (onUpdateItem) {
      onUpdateItem(item.id, column.key, value);
    }
  }, [onUpdate, onUpdateItem, column.key, item.id]);

  // Memoized typing handler
  const handleUserTyping = useCallback((typing: boolean) => {
    onUserTyping?.(typing);
  }, [onUserTyping]);

  const baseClassName = `p-2 border-r border-gray-200 dark:border-gray-700 ${className}`;

  // Handle different cell types with optimized components
  switch (column.key) {
    case 'rowNumber':
      return (
        <div className={`${baseClassName} text-center font-mono text-sm text-gray-500`}>
          {item.rowNumber || ''}
        </div>
      );

    case 'name':
    case 'talent':
    case 'notes':
      return (
        <div className={baseClassName}>
          <TextAreaCell
            value={item[column.key as keyof RundownItem] as string || ''}
            onChange={handleUpdate}
            onUserTyping={handleUserTyping}
            placeholder={`Enter ${column.name.toLowerCase()}`}
            maxRows={column.key === 'notes' ? 4 : 2}
            className="w-full border-0 p-0 focus:ring-0 bg-transparent resize-none"
          />
        </div>
      );

    case 'script':
      return (
        <div className={baseClassName}>
          <TextAreaCell
            value={item.script || ''}
            onChange={handleUpdate}
            onUserTyping={handleUserTyping}
            placeholder="Enter script content"
            maxRows={6}
            className="w-full border-0 p-0 focus:ring-0 bg-transparent resize-none"
          />
        </div>
      );

    case 'duration':
    case 'startTime':
    case 'endTime':
      return (
        <div className={baseClassName}>
          <TimeDisplayCell
            value={item[column.key as keyof RundownItem] as string || '00:00'}
            backgroundColor={backgroundColor}
            textColor={textColor}
          />
        </div>
      );

    case 'gfx':
    case 'video':
      return (
        <div className={baseClassName}>
          <TextAreaCell
            value={item[column.key as keyof RundownItem] as string || ''}
            onChange={handleUpdate}
            onUserTyping={handleUserTyping}
            placeholder={`Enter ${column.name.toLowerCase()}`}
            maxRows={3}
            className="w-full border-0 p-0 focus:ring-0 bg-transparent resize-none"
          />
        </div>
      );

    case 'images':
      return (
        <div className={baseClassName}>
          <ImageCell
            value={item.images || ''}
            itemId={item.id}
            cellRefKey="images"
            cellRefs={cellRefs || { current: {} }}
            textColor={textColor}
            backgroundColor={backgroundColor}
            onUpdateValue={handleUpdate}
            onCellClick={onCellClick ? (e) => onCellClick(item.id, 'images') : undefined}
            onKeyDown={onKeyDown || (() => {})}
          />
        </div>
      );

    default:
      // Handle custom fields with optimized component
      if (column.isCustom && item.customFields) {
        return (
          <div className={baseClassName}>
            <CustomFieldCell
              value={item.customFields[column.key] || ''}
              onChange={(value) => {
                const updatedCustomFields = {
                  ...item.customFields,
                  [column.key]: value
                };
                if (onUpdate) {
                  onUpdate('customFields', updatedCustomFields);
                } else if (onUpdateItem) {
                  onUpdateItem(item.id, 'customFields', updatedCustomFields);
                }
              }}
              onUserTyping={handleUserTyping}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              className="w-full border-0 p-0 focus:ring-0 bg-transparent"
            />
          </div>
        );
      }

      // Default text cell
      return (
        <div className={baseClassName}>
          <TextAreaCell
            value={item[column.key as keyof RundownItem] as string || ''}
            onChange={handleUpdate}
            onUserTyping={handleUserTyping}
            placeholder={`Enter ${column.name.toLowerCase()}`}
            maxRows={2}
            className="w-full border-0 p-0 focus:ring-0 bg-transparent resize-none"
          />
        </div>
      );
  }
});

CellRenderer.displayName = 'CellRenderer';

export default CellRenderer;
