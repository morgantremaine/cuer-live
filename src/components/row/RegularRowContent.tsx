
import React from 'react';
import { Column } from '@/hooks/useColumnsManager';
import { RundownItem } from '@/hooks/useRundownItems';

interface RegularRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor: string;
  backgroundColor: string;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
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
  textColor,
  backgroundColor,
  isCurrentlyPlaying,
  isDraggingMultiple,
  isSelected,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: RegularRowContentProps) => {
  const renderCellContent = (column: Column, value: string) => {
    if (column.id === 'rowNumber') {
      return (
        <span className="text-xs text-muted-foreground min-w-[20px] text-center">
          {rowNumber}
        </span>
      );
    }

    const isNameColumn = column.id === 'name';
    const isScriptColumn = column.id === 'script';
    const isNotesColumn = column.id === 'notes';
    const isTalentColumn = column.id === 'talent';
    const isGfxColumn = column.id === 'gfx';
    const isVideoColumn = column.id === 'video';
    const isColorColumn = column.id === 'color';
    const isStartTimeColumn = column.id === 'startTime';
    const isDurationColumn = column.id === 'duration';
    const isEndTimeColumn = column.id === 'endTime';
    const isElapsedTimeColumn = column.id === 'elapsedTime';

    const itemId = item.id;

    let className = 'px-2 py-1 whitespace-normal break-words';

    if (isCurrentlyPlaying) {
      className += ' font-semibold';
    }

    return (
      <td
        key={column.id}
        className={className}
        style={{
          width: getColumnWidth(column),
          minWidth: getColumnWidth(column),
          maxWidth: getColumnWidth(column)
        }}
      >
        {(isNameColumn || isScriptColumn || isNotesColumn || isTalentColumn || isGfxColumn || isVideoColumn || isColorColumn || isStartTimeColumn || isDurationColumn || isEndTimeColumn || isElapsedTimeColumn) ? (
          <textarea
            ref={el => cellRefs.current[`${itemId}-${column.id}`] = el as HTMLTextAreaElement}
            className={`w-full h-full resize-none border-none p-0 m-0 bg-transparent outline-none ${textColor}`}
            value={value || ''}
            onClick={(e) => {
              e.stopPropagation(); // Prevent row selection when clicking inside the textarea
              onCellClick(itemId, column.id);
            }}
            onKeyDown={(e) => onKeyDown(e, itemId, column.id)}
            onChange={(e) => onUpdateItem(itemId, column.id, e.target.value)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {value}
          </span>
        )}
      </td>
    );
  };

  return (
    <>
      {columns.map(column => {
        let value = '';

        if (column.id === 'rowNumber') {
          value = rowNumber;
        } else if (column.id === 'name') {
          value = item.name;
        } else if (column.id === 'startTime') {
          value = item.startTime;
        } else if (column.id === 'duration') {
          value = item.duration;
        } else if (column.id === 'endTime') {
          value = item.endTime;
        } else if (column.id === 'elapsedTime') {
          value = item.elapsedTime;
        } else if (column.id === 'talent') {
          value = item.talent;
        } else if (column.id === 'script') {
          value = item.script;
        } else if (column.id === 'gfx') {
          value = item.gfx;
        } else if (column.id === 'video') {
          value = item.video;
        } else if (column.id === 'notes') {
          value = item.notes;
        } else if (column.id === 'color') {
          value = item.color;
        } else if (item.customFields && item.customFields[column.id]) {
          value = item.customFields[column.id] || '';
        }

        return renderCellContent(column, value);
      })}
    </>
  );
};

export default RegularRowContent;
