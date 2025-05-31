
import React from 'react';
import RundownHeader from './RundownHeader';
import RundownToolbar from './RundownToolbar';

interface RundownHeaderSectionProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  onAddRow: () => void;
  onAddHeader: () => void;
  onAddColumn: () => void;
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
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
}

const RundownHeaderSection = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  onAddRow,
  onAddHeader,
  onAddColumn,
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
  hasUnsavedChanges,
  isSaving,
  rundownTitle,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange
}: RundownHeaderSectionProps) => {
  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800">
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
      />
      
      <RundownToolbar
        onAddRow={onAddRow}
        onAddHeader={onAddHeader}
        onAddColumn={onAddColumn}
        onShowColumnManager={onShowColumnManager}
        selectedCount={selectedCount}
        hasClipboardData={hasClipboardData}
        onCopySelectedRows={onCopySelectedRows}
        onPasteRows={onPasteRows}
        onDeleteSelectedRows={onDeleteSelectedRows}
        onClearSelection={onClearSelection}
        selectedRowId={selectedRowId}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        onPlay={onPlay}
        onPause={onPause}
        onForward={onForward}
        onBackward={onBackward}
      />
    </div>
  );
};

export default RundownHeaderSection;
