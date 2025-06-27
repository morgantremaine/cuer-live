
import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { SearchHighlight } from '../SearchHighlight';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface RegularRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  status?: 'upcoming' | 'current' | 'completed';
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  currentSegmentId?: string | null;
  searchTerm?: string;
  caseSensitive?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const RegularRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  backgroundColor,
  status,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  isSelected = false,
  currentSegmentId,
  searchTerm = '',
  caseSensitive = false,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: RegularRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-2 py-1 text-sm font-mono align-middle border border-border w-16 min-w-16"
        style={{ backgroundColor }}
      >
        <div className="flex items-center space-x-1">
          {isCurrentlyPlaying && (
            <Play 
              className="h-5 w-5 text-blue-500 fill-blue-500" 
            />
          )}
          <SearchHighlight 
            text={rowNumber}
            searchTerm={searchTerm}
            caseSensitive={caseSensitive}
            className={textColor ? '' : ''}
            style={{ color: textColor }}
          />
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        const isCurrentSegmentName = currentSegmentId === item.id && 
          (column.key === 'segmentName' || column.key === 'name');
        
        // Check if this specific field contains the current search match
        const fieldValue = column.isCustom 
          ? (item.customFields?.[column.key] || '')
          : (item as any)[column.key] || '';
        
        const hasSearchMatch = searchTerm && fieldValue && 
          (caseSensitive 
            ? fieldValue.includes(searchTerm) 
            : fieldValue.toLowerCase().includes(searchTerm.toLowerCase())
          );
        
        return (
          <td
            key={column.id}
            className={`align-middle border border-border ${isCurrentSegmentName ? 'relative' : ''}`}
            style={{ 
              width: columnWidth, 
              minWidth: columnWidth,
              backgroundColor 
            }}
            data-field={column.key}
            data-has-match={hasSearchMatch}
          >
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={textColor}
              backgroundColor={backgroundColor}
              currentSegmentId={currentSegmentId}
              searchTerm={searchTerm}
              caseSensitive={caseSensitive}
              isCurrentMatch={false} // This will be calculated inside CellRenderer
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              width={columnWidth}
            />
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
