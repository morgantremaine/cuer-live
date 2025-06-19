
import React from 'react';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RegularRowProps {
  item: RundownItem;
  index: number;
  visibleColumns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  isSelected: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  isDraggingMultiple: boolean;
  showColorPicker: boolean;
  isCurrent: boolean;
  getColumnWidth: (columnId: string) => string;
  rowNumber: number;
  rowStatus: 'upcoming' | 'current' | 'completed';
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (id: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onDeleteSelectedRows: () => void;
  onCopySelectedRows: () => void;
  highlightedCell?: {
    itemId: string;
    field: string;
    startIndex: number;
    endIndex: number;
  } | null;
}

const RegularRow = (props: RegularRowProps) => {
  const { item, visibleColumns, cellRefs, getColumnWidth, onUpdateItem, onCellClick, onKeyDown, highlightedCell } = props;
  
  const { handleRowClick } = useRowEventHandlers({
    item,
    index: props.index,
    isSelected: props.isSelected,
    selectedRowsCount: 1,
    onRowSelect: props.onRowSelect,
    onDeleteRow: props.onDeleteRow,
    onDeleteSelectedRows: props.onDeleteSelectedRows,
    onCopySelectedRows: props.onCopySelectedRows,
    onToggleColorPicker: props.onToggleColorPicker,
    onToggleFloat: props.onToggleFloat
  });
  
  const { rowClassName, textColor, backgroundColor } = useRowStyling({
    isDragged: props.isDragged,
    isDraggingMultiple: props.isDraggingMultiple,
    isSelected: props.isSelected,
    isCurrent: props.isCurrent,
    item: props.item,
    rowStatus: props.rowStatus
  });

  return (
    <>
      <tr
        className={rowClassName}
        draggable
        onDragStart={(e) => props.onDragStart(e, props.index)}
        onDragOver={(e) => props.onDragOver(e, props.index)}
        onDragLeave={props.onDragLeave}
        onDrop={(e) => props.onDrop(e, props.index)}
        onClick={handleRowClick}
        data-row-id={item.id}
        data-row-index={props.index}
        style={{ backgroundColor }}
      >
        {visibleColumns.map((column) => (
          <td
            key={column.id}
            className="border-b border-gray-200 dark:border-gray-700 relative"
            style={{ 
              width: getColumnWidth(column.id)
            }}
          >
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={textColor}
              backgroundColor={backgroundColor}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              highlightedCell={highlightedCell}
            />
          </td>
        ))}
      </tr>
      
      <RundownContextMenu
        item={item}
        showColorPicker={props.showColorPicker}
        onToggleColorPicker={() => props.onToggleColorPicker(item.id)}
        onColorSelect={props.onColorSelect}
        onDeleteRow={() => props.onDeleteRow(item.id)}
        onToggleFloat={() => props.onToggleFloat(item.id)}
      />
    </>
  );
};

export default RegularRow;
