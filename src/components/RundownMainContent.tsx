
import React from 'react';
import RundownContent from './RundownContent';
import RundownToolbar from './RundownToolbar';
import ColumnManager from './ColumnManager';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownMainContentProps {
  currentTime: Date;
  items: RundownItem[];
  visibleColumns: Column[];
  columns: Column[];
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newName: string) => void;
  handleToggleColumnVisibility: (columnId: string) => void;
  handleLoadLayout: (layoutColumns: Column[]) => void;
  timeRemaining: number;
  isPlaying: boolean;
  currentSegmentName: string;
  totalDuration: string;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  // Playback control functions
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId?: string;
  rundownTitle?: string;
}

const RundownMainContent = (props: RundownMainContentProps) => {
  // Get the first selected row ID for toolbar actions
  const selectedRowId = props.selectedRows.size > 0 ? Array.from(props.selectedRows)[0] : null;

  const handleOpenTeleprompter = () => {
    if (!props.rundownId) {
      console.log('Cannot open teleprompter - no rundownId');
      return;
    }
    const teleprompterUrl = `${window.location.origin}/teleprompter/${props.rundownId}`;
    window.open(teleprompterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Toolbar Section */}
      <RundownToolbar
        selectedCount={props.selectedRows.size}
        hasClipboardData={props.hasClipboardData || false}
        onAddRow={() => props.onAddRow?.()}
        onAddHeader={() => props.onAddHeader?.()}
        onCopySelectedRows={props.onCopySelectedRows}
        onPasteRows={() => props.onPasteRows?.()}
        onDeleteSelectedRows={props.onDeleteSelectedRows}
        onClearSelection={() => props.onClearSelection?.()}
        onUndo={props.onUndo}
        canUndo={props.canUndo}
        lastAction={props.lastAction}
        selectedRowId={selectedRowId}
        isPlaying={props.isPlaying}
        currentSegmentId={props.currentSegmentId}
        timeRemaining={props.timeRemaining}
        onPlay={props.onPlay}
        onPause={props.onPause}
        onForward={props.onForward}
        onBackward={props.onBackward}
        onOpenColumnManager={() => props.setShowColumnManager(true)}
        rundownId={props.rundownId}
        onOpenTeleprompter={handleOpenTeleprompter}
      />

      {/* Main Content Area */}
      <RundownContent
        items={props.items}
        visibleColumns={props.visibleColumns}
        currentTime={props.currentTime}
        showColorPicker={props.showColorPicker}
        cellRefs={props.cellRefs}
        selectedRows={props.selectedRows}
        draggedItemIndex={props.draggedItemIndex}
        isDraggingMultiple={props.isDraggingMultiple}
        dropTargetIndex={props.dropTargetIndex}
        currentSegmentId={props.currentSegmentId}
        hasClipboardData={props.hasClipboardData}
        getColumnWidth={props.getColumnWidth}
        updateColumnWidth={props.updateColumnWidth}
        getRowNumber={props.getRowNumber}
        getRowStatus={props.getRowStatus}
        calculateHeaderDuration={props.calculateHeaderDuration}
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
        onDragLeave={props.onDragLeave}
        onDrop={props.onDrop}
        onCopySelectedRows={props.onCopySelectedRows}
        onDeleteSelectedRows={props.onDeleteSelectedRows}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
      />
      
      {/* Column Manager Modal */}
      {props.showColumnManager && (
        <ColumnManager
          columns={props.columns}
          onAddColumn={props.handleAddColumn}
          onReorderColumns={props.handleReorderColumns}
          onDeleteColumn={props.handleDeleteColumnWithCleanup}
          onToggleColumnVisibility={props.handleToggleColumnVisibility}
          onLoadLayout={props.handleLoadLayout}
          onRenameColumn={props.handleRenameColumn}
          onClose={() => props.setShowColumnManager(false)}
        />
      )}
    </>
  );
};

export default RundownMainContent;
