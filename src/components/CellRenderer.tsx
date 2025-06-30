
import React, { memo, useCallback } from 'react';
import { CustomFieldCell } from './cells/CustomFieldCell';
import { ImageCell } from './cells/ImageCell';
import { TextAreaCell } from './cells/TextAreaCell';
import { TimeDisplayCell } from './cells/TimeDisplayCell';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/types/rundown';

interface CellRendererProps {
  item: RundownItem;
  column: Column;
  onUpdate: (field: string, value: any) => void;
  onUserTyping?: (typing: boolean) => void;
  isSelected?: boolean;
  className?: string;
}

// Memoized cell renderer for better performance
const CellRenderer = memo(({ 
  item, 
  column, 
  onUpdate, 
  onUserTyping,
  isSelected = false,
  className = '' 
}: CellRendererProps) => {
  // Memoized update handler
  const handleUpdate = useCallback((value: any) => {
    onUpdate(column.key, value);
  }, [onUpdate, column.key]);

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
            onChange={handleUpdate}
            onUserTyping={handleUserTyping}
            className="w-full text-center font-mono"
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
            images={item.images || []}
            onChange={handleUpdate}
            className="w-full"
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
                onUpdate('customFields', updatedCustomFields);
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
