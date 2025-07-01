import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchState, SearchMatch } from '@/hooks/useRundownSearch';

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
  currentSegmentId?: string | null;
  searchState?: SearchState;
  currentMatch?: SearchMatch | null;
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
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  onSearchOpen?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RundownRow = (props: RundownRowProps) => {
  // Only use multi-selection state for determining if selected
  const isActuallySelected = props.isSelected || false;

  // Debug wrapper for onJumpToHere
  const handleJumpToHereDebug = (segmentId: string) => {
    console.log('🎯 RundownRow: onJumpToHere called with segmentId:', segmentId);
    console.log('🎯 RundownRow: onJumpToHere function exists:', !!props.onJumpToHere);
    if (props.onJumpToHere) {
      console.log('🎯 RundownRow: Calling parent onJumpToHere');
      props.onJumpToHere(segmentId);
    } else {
      console.log('🎯 RundownRow: onJumpToHere is undefined!');
    }
  };

  if (isHeaderItem(props.item)) {
    return (
      <HeaderRow 
        {...props} 
        isSelected={isActuallySelected}
        headerDuration={props.headerDuration || ''}
        selectedRowsCount={props.selectedRowsCount || 1}
        selectedRows={props.selectedRows}
        hasClipboardData={props.hasClipboardData}
        currentSegmentId={props.currentSegmentId}
        searchState={props.searchState}
        currentMatch={props.currentMatch}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        onSearchOpen={props.onSearchOpen}
        // Note: onJumpToHere not passed to HeaderRow since headers don't need jump functionality
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
      currentSegmentId={props.currentSegmentId}
      searchState={props.searchState}
      currentMatch={props.currentMatch}
      onToggleFloat={props.onToggleFloat || (() => {})}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onSearchOpen={props.onSearchOpen}
      onJumpToHere={handleJumpToHereDebug}
    />
  );
};

export default RundownRow;
