import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import { CSVExportData } from '@/utils/csvExport';

interface RundownHeaderPropsAdapterProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  rundownId?: string;
  onOpenTeleprompter: () => void;
  items?: any[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isProcessingShowcallerUpdate?: boolean;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const RundownHeaderPropsAdapter = (props: RundownHeaderPropsAdapterProps) => {
  return (
    <RundownHeaderSection
      currentTime={props.currentTime}
      timezone={props.timezone}
      onTimezoneChange={props.onTimezoneChange}
      totalRuntime={props.totalRuntime}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onShowColumnManager={props.onShowColumnManager}
      selectedCount={props.selectedCount}
      hasClipboardData={props.hasClipboardData}
      onCopySelectedRows={props.onCopySelectedRows}
      onPasteRows={props.onPasteRows}
      onDeleteSelectedRows={props.onDeleteSelectedRows}
      onClearSelection={props.onClearSelection}
      selectedRowId={props.selectedRowId}
      isPlaying={props.isPlaying}
      currentSegmentId={props.currentSegmentId}
      timeRemaining={props.timeRemaining}
      onPlay={props.onPlay}
      onPause={props.onPause}
      onForward={props.onForward}
      onBackward={props.onBackward}
      onReset={props.onReset}
      hasUnsavedChanges={props.hasUnsavedChanges}
      isSaving={props.isSaving}
      rundownTitle={props.rundownTitle}
      onTitleChange={props.onTitleChange}
      rundownStartTime={props.rundownStartTime}
      onRundownStartTimeChange={props.onRundownStartTimeChange}
      rundownId={props.rundownId}
      onOpenTeleprompter={props.onOpenTeleprompter}
      items={props.items}
      visibleColumns={props.visibleColumns}
      onUndo={props.onUndo}
      canUndo={props.canUndo}
      lastAction={props.lastAction}
      isConnected={props.isConnected}
      isProcessingRealtimeUpdate={props.isProcessingRealtimeUpdate}
      isProcessingShowcallerUpdate={props.isProcessingShowcallerUpdate}
      autoScrollEnabled={props.autoScrollEnabled}
      onToggleAutoScroll={props.onToggleAutoScroll}
    />
  );
};

export default RundownHeaderPropsAdapter;
