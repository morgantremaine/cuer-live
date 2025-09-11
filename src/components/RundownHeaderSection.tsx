
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
  showDate?: Date | null;
  onShowDateChange?: (date: Date | null) => void;
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
  onJumpToCurrentSegment?: () => void;
  onUpdateItem?: (id: string, field: string, value: string) => void;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
  hasActiveTeammates?: boolean;
  // Zoom controls
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isDefaultZoom?: boolean;
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
  showDate,
  onShowDateChange,
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
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  onUpdateItem,
  onShowFindReplace,
  onShowNotes,
  hasActiveTeammates,
  // Zoom controls
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  isDefaultZoom
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
        showDate={showDate}
        onShowDateChange={onShowDateChange}
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
        rundownId={rundownId}
        onUpdateItem={onUpdateItem}
        hasActiveTeammates={hasActiveTeammates}
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
        onJumpToCurrentSegment={onJumpToCurrentSegment}
        onShowFindReplace={onShowFindReplace}
        onShowNotes={onShowNotes}
        // Zoom controls
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isDefaultZoom={isDefaultZoom}
      />
    </div>
  );
};

export default RundownHeaderSection;
