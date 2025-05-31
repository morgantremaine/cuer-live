
import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  headerDuration?: string;
  hasClipboardData?: boolean;
  currentHighlight?: SearchHighlight | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat?: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RundownRow = (props: RundownRowProps) => {
  // Calculate if this row is selected based on selectedRows Set
  const isActuallySelected = props.selectedRows ? props.selectedRows.has(props.item.id) : false;
  
  // Debug the calculated selection
  console.log('RundownRow - itemId:', props.item.id, 'isHeader:', isHeaderItem(props.item), 'isSelected prop:', props.isSelected, 'selectedRows:', props.selectedRows);
  console.log('RundownRow - calculated isSelected:', isActuallySelected, 'for item:', props.item.id);

  if (isHeaderItem(props.item)) {
    return (
      <HeaderRow 
        {...props} 
        isSelected={isActuallySelected}
        headerDuration={props.headerDuration || ''}
        selectedRowsCount={props.selectedRowsCount || 1}
        selectedRows={props.selectedRows}
        hasClipboardData={props.hasClipboardData}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
      />
    );
  }

  return (
    <RegularRow 
      {...props} 
      isSelected={isActuallySelected}
      isCurrentlyPlaying={props.isCurrentlyPlaying}
      isDraggingMultiple={props.isDraggingMultiple}
      selectedRowsCount={props.selectedRowsCount || 1}
      selectedRows={props.selectedRows}
      hasClipboardData={props.hasClipboardData}
      onToggleFloat={props.onToggleFloat || (() => {})}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
    />
  );
};

export default RundownRow;
