import React from 'react';
import RundownHeaderPropsAdapter from './RundownHeaderPropsAdapter';
import RundownContent from './RundownContent';

interface RundownMainContentProps {
  items: any[];
  columns: any[];
  visibleColumns: any[];
  rundownTitle: string;
  rundownStartTime: string;
  timezone: string;
  currentTime: Date;
  rundownId: string | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isConnected: boolean;
  isProcessingRealtimeUpdate: boolean;
  isProcessingShowcallerUpdate?: boolean;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  isController: boolean;
  selectedRowId: string | null;
  handleRowSelection: (id: string | null) => void;
  clearRowSelection: () => void;
  totalRuntime: string;
  getRowNumber: (id: string) => number;
  getHeaderDuration: (headerId: string) => string;
  calculateHeaderDuration: (headerId: string) => string;
  updateItem: (id: string, field: string, value: any) => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleItems: (ids: string[]) => void;
  addItem: (item: any) => void;
  setTitle: (title: string) => void;
  setStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  addRow: () => void;
  addHeader: () => void;
  addRowAtIndex: (index: number) => void;
  addHeaderAtIndex: (index: number) => void;
  addColumn: (column: any) => void;
  updateColumnWidth: (columnId: string, width: number) => void;
  setColumns: (columns: any[]) => void;
  play: (segmentId?: string) => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  reset: () => void;
  jumpToSegment: (segmentId: string) => void;
  undo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  autoScrollEnabled: boolean;
  toggleAutoScroll: () => void;
  [key: string]: any;
}

const RundownMainContent = (props: RundownMainContentProps) => {
  return (
    <div className="flex flex-col h-full">
      <RundownHeaderPropsAdapter
        currentTime={props.currentTime}
        timezone={props.timezone}
        onTimezoneChange={(timezone) => props.setTimezone(timezone)}
        totalRuntime={props.totalRuntime}
        onAddRow={props.addRow}
        onAddHeader={props.addHeader}
        onShowColumnManager={() => {}} // Handle column manager
        selectedCount={0}
        hasClipboardData={false}
        onCopySelectedRows={() => {}}
        onPasteRows={() => {}}
        onDeleteSelectedRows={() => {}}
        onClearSelection={props.clearRowSelection}
        selectedRowId={props.selectedRowId}
        isPlaying={props.isPlaying}
        currentSegmentId={props.currentSegmentId}
        timeRemaining={props.timeRemaining}
        onPlay={props.play}
        onPause={props.pause}
        onForward={props.forward}
        onBackward={props.backward}
        onReset={props.reset}
        hasUnsavedChanges={props.hasUnsavedChanges}
        isSaving={props.isSaving}
        rundownTitle={props.rundownTitle}
        onTitleChange={props.setTitle}
        rundownStartTime={props.rundownStartTime}
        onRundownStartTimeChange={props.setStartTime}
        rundownId={props.rundownId}
        onOpenTeleprompter={() => {}}
        items={props.items}
        visibleColumns={props.visibleColumns}
        onUndo={props.undo}
        canUndo={props.canUndo}
        lastAction={props.lastAction}
        isConnected={props.isConnected}
        isProcessingRealtimeUpdate={props.isProcessingRealtimeUpdate}
        isProcessingShowcallerUpdate={props.isProcessingShowcallerUpdate} // Add this line
        autoScrollEnabled={props.autoScrollEnabled}
        onToggleAutoScroll={props.toggleAutoScroll}
      />
      <RundownContent
        items={props.items}
        columns={props.columns}
        visibleColumns={props.visibleColumns}
        selectedRowId={props.selectedRowId}
        onRowSelect={props.handleRowSelection}
        onItemUpdate={props.updateItem}
        onDeleteRow={props.deleteRow}
        onToggleFloat={props.toggleFloatRow}
        getRowNumber={props.getRowNumber}
        getHeaderDuration={props.getHeaderDuration}
        calculateHeaderDuration={props.calculateHeaderDuration}
        currentSegmentId={props.currentSegmentId}
        isPlaying={props.isPlaying}
        timeRemaining={props.timeRemaining}
        autoScrollEnabled={props.autoScrollEnabled}
      />
    </div>
  );
};

export default RundownMainContent;
