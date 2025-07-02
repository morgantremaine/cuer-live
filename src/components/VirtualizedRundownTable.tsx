
import React, { useMemo, useCallback, forwardRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import RundownRow from './RundownRow';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface VirtualizedRundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData: boolean;
  selectedRowId: string | null;
  searchTerm?: string;
  searchResults?: { itemId: string; fieldKey: string; matchText: string }[];
  currentSearchIndex?: number;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: any) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

const ROW_HEIGHT = 56;

interface RowData {
  items: RundownItem[];
  props: VirtualizedRundownTableProps;
}

// Custom wrapper component for the virtualized list content
const VirtualizedTableBody = forwardRef<HTMLDivElement, { 
  children: React.ReactNode;
  style: React.CSSProperties;
}>((props, ref) => (
  <div ref={ref} style={props.style}>
    <table className="w-full border-collapse table-fixed">
      <tbody>
        {props.children}
      </tbody>
    </table>
  </div>
));

VirtualizedTableBody.displayName = 'VirtualizedTableBody';

const VirtualizedRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
  const { items, props } = data;
  const item = items[index];
  
  if (!item) return null;

  const rowNumber = props.getRowNumber(index);
  const status = props.getRowStatus(item);
  const headerDuration = item.type === 'header' ? props.getHeaderDuration(index) : '';
  const isMultiSelected = props.selectedRows.has(item.id);
  const isSingleSelected = props.selectedRowId === item.id;
  const isActuallySelected = isMultiSelected || isSingleSelected;
  const isDragging = props.draggedItemIndex === index;
  const isCurrentlyPlaying = item.id === props.currentSegmentId;

  // Check if this row has search matches
  const hasSearchMatch = props.searchResults?.some(result => result.itemId === item.id) || false;
  const isCurrentSearchResult = props.searchResults && props.currentSearchIndex !== undefined 
    ? props.searchResults[props.currentSearchIndex]?.itemId === item.id 
    : false;

  return (
    <div style={style} className="w-full">
      {/* Drop indicator above */}
      {props.dropTargetIndex === index && (
        <div className="h-0.5 bg-gray-400 w-full relative z-50 mb-1"></div>
      )}
      
      <table className="w-full border-collapse table-fixed">
        <tbody>
          <RundownRow
            item={item}
            index={index}
            rowNumber={rowNumber}
            status={status}
            showColorPicker={props.showColorPicker}
            cellRefs={props.cellRefs}
            columns={props.visibleColumns}
            isSelected={isActuallySelected}
            isCurrentlyPlaying={isCurrentlyPlaying}
            isDraggingMultiple={props.isDraggingMultiple}
            selectedRowsCount={props.selectedRows.size}
            selectedRows={props.selectedRows}
            headerDuration={headerDuration}
            hasClipboardData={props.hasClipboardData}
            currentSegmentId={props.currentSegmentId}
            isDragging={isDragging}
            searchTerm={props.searchTerm}
            hasSearchMatch={hasSearchMatch}
            isCurrentSearchResult={isCurrentSearchResult}
            onUpdateItem={props.onUpdateItem}
            onCellClick={props.onCellClick}
            onKeyDown={props.onKeyDown}
            onToggleColorPicker={props.onToggleColorPicker}
            onColorSelect={props.onColorSelect}
            onDeleteRow={props.onDeleteRow}
            onToggleFloat={props.onToggleFloat}
            onRowSelect={props.onRowSelect}
            onDragStart={props.onDragStart}
            onDragOver={props.onDragOver}
            onDrop={props.onDrop}
            onCopySelectedRows={props.onCopySelectedRows}
            onDeleteSelectedRows={props.onDeleteSelectedRows}
            onPasteRows={props.onPasteRows}
            onClearSelection={props.onClearSelection}
            onAddRow={props.onAddRow}
            onAddHeader={props.onAddHeader}
            onJumpToHere={props.onJumpToHere}
            getColumnWidth={props.getColumnWidth}
          />
        </tbody>
      </table>
      
      {/* Drop indicator after last row */}
      {props.dropTargetIndex === items.length && index === items.length - 1 && (
        <div className="h-0.5 bg-gray-400 w-full relative z-50 mt-1"></div>
      )}
    </div>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

const VirtualizedRundownTable = forwardRef<List, VirtualizedRundownTableProps>(
  (props, ref) => {
    const { items } = props;
    
    const rowData = useMemo((): RowData => ({
      items,
      props
    }), [items, props]);

    const itemCount = items.length;
    const height = Math.min(800, itemCount * ROW_HEIGHT);

    return (
      <div className="relative w-full bg-background">
        {itemCount === 0 ? (
          <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
            No items to display
          </div>
        ) : (
          <List
            ref={ref}
            height={height}
            itemCount={itemCount}
            itemSize={ROW_HEIGHT}
            itemData={rowData}
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {VirtualizedRow}
          </List>
        )}
      </div>
    );
  }
);

VirtualizedRundownTable.displayName = 'VirtualizedRundownTable';

export default VirtualizedRundownTable;
