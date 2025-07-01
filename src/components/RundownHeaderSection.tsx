
import React from 'react';
import RundownHeader from './RundownHeader';
import RundownToolbar from './RundownToolbar';
import { CSVExportData } from '@/utils/csvExport';

interface RundownHeaderSectionProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  onAddRow: (selectedRowId?: string | null) => void;
  onAddHeader: (selectedRowId?: string | null) => void;
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
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const RundownHeaderSection = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  selectedCount,
  hasClipboardData,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  hasUnsavedChanges,
  isSaving,
  rundownTitle,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  rundownId,
  onOpenTeleprompter,
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll
}: RundownHeaderSectionProps) => {
  return (
    <div>
      <RundownHeader
        currentTime={currentTime}
        timezone={timezone}
        onTimezoneChange={onTimezoneChange}
        totalRuntime={totalRuntime}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        title={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        items={items}
        visibleColumns={visibleColumns}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
      />
      <RundownToolbar
        onAddRow={() => onAddRow(selectedRowId)}
        onAddHeader={() => onAddHeader(selectedRowId)}
        onShowColumnManager={onShowColumnManager}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        onPlay={onPlay}
        onPause={onPause}
        onForward={onForward}
        onBackward={onBackward}
        onReset={onReset}
        rundownId={rundownId}
        onOpenTeleprompter={onOpenTeleprompter}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        rundownTitle={rundownTitle}
        rundownData={rundownData}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
      />
    </div>
  );
};

export default RundownHeaderSection;
