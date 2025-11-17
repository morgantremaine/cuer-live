
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
  rundownEndTime?: string;
  onRundownEndTimeChange?: (endTime: string) => void;
  showDate?: Date | null;
  onShowDateChange?: (date: Date | null) => void;
  rundownId?: string;
  onOpenTeleprompter: () => void;
  items?: any[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  onJumpToCurrentSegment?: () => void;
  onUpdateItem?: (id: string, field: string, value: string) => void;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
  onShowHistory?: () => void;
  hasActiveTeammates?: boolean;
  activeTeammateNames?: string[];
  // Zoom controls
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isDefaultZoom?: boolean;
  // Row number locking
  numberingLocked?: boolean;
  onToggleLock?: () => void;
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
  rundownEndTime,
  onRundownEndTimeChange,
  showDate,
  onShowDateChange,
  rundownId,
  onOpenTeleprompter,
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  onRedo,
  canRedo,
  nextRedoAction,
  isConnected,
  isProcessingRealtimeUpdate,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  onUpdateItem,
  onShowFindReplace,
  onShowNotes,
  onShowHistory,
  hasActiveTeammates,
  activeTeammateNames,
  // Zoom controls
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  isDefaultZoom,
  // Row number locking
  numberingLocked,
  onToggleLock
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
        rundownEndTime={rundownEndTime}
        onRundownEndTimeChange={onRundownEndTimeChange}
        showDate={showDate}
        onShowDateChange={onShowDateChange}
        items={items}
        visibleColumns={visibleColumns}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        onRedo={onRedo}
        canRedo={canRedo}
        nextRedoAction={nextRedoAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        rundownId={rundownId}
        onUpdateItem={onUpdateItem}
        hasActiveTeammates={hasActiveTeammates}
        activeTeammateNames={activeTeammateNames}
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
        onRedo={onRedo}
        canRedo={canRedo}
        nextRedoAction={nextRedoAction}
        rundownTitle={rundownTitle}
        rundownData={rundownData}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        onJumpToCurrentSegment={onJumpToCurrentSegment}
        onShowFindReplace={onShowFindReplace}
        onShowNotes={onShowNotes}
        onShowHistory={onShowHistory}
        // Zoom controls
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isDefaultZoom={isDefaultZoom}
        // Row number locking
        numberingLocked={numberingLocked}
        onToggleLock={onToggleLock}
      />
    </div>
  );
};

export default RundownHeaderSection;
