
import React from 'react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';
import { SearchMatch } from '@/hooks/useRundownSearch';

interface HeaderRowContentProps {
  item: RundownItem;
  columns: Column[];
  headerDuration: string;
  rowNumber: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  searchMatches?: SearchMatch[];
  currentSearchMatch?: SearchMatch | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const HeaderRowContent = ({
  item,
  columns,
  headerDuration,
  rowNumber,
  backgroundColor,
  currentSegmentId,
  searchMatches = [],
  currentSearchMatch,
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: HeaderRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  return (
    <>
      {/* Row number column */}
      <td 
        className="px-2 py-1 text-sm font-mono align-middle text-center border border-border w-16 min-w-16"
        style={{ backgroundColor }}
      >
        <span style={{ color: textColor }}>{rowNumber}</span>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        
        return (
          <td
            key={column.id}
            className="align-middle border border-border"
            style={{ 
              width: columnWidth, 
              minWidth: columnWidth,
              backgroundColor 
            }}
          >
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={textColor}
              backgroundColor={backgroundColor}
              currentSegmentId={currentSegmentId}
              searchMatches={searchMatches}
              currentSearchMatch={currentSearchMatch}
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

export default HeaderRowContent;
