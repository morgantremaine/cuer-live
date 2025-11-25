
import React from 'react';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';
import AutoScrollToggle from './AutoScrollToggle';
import ZoomControls from './ZoomControls';
import { CSVExportData } from '@/utils/csvExport';

interface DesktopToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  rundownId: string | undefined;
  teamId?: string;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  rundownTitle?: string;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  onJumpToCurrentSegment?: () => void;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
  onShowHistory?: () => void;
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
  userRole?: string | null;
}

const DesktopToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  onRedo,
  canRedo,
  nextRedoAction,
  rundownId,
  teamId,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  rundownTitle,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  onShowFindReplace,
  onShowNotes,
  onShowHistory,
  // Zoom props
  zoomLevel = 1.0,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn = true,
  canZoomOut = true,
  isDefaultZoom = true,
  // Lock props
  numberingLocked = false,
  onToggleLock,
  userRole
}: DesktopToolbarProps) => {
  const canUseShowcaller = userRole !== 'member';
  return (
    <div className="p-1 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
      <div className="flex space-x-1">
        <MainActionButtons
          onAddRow={onAddRow}
          onAddHeader={onAddHeader}
          onShowColumnManager={onShowColumnManager}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
          onRedo={onRedo}
          canRedo={canRedo}
          nextRedoAction={nextRedoAction}
          rundownId={rundownId}
          teamId={teamId}
          selectedRowId={selectedRowId}
          isMobile={false}
          rundownTitle={rundownTitle}
          rundownData={rundownData}
          onShowFindReplace={onShowFindReplace}
          onShowNotes={onShowNotes}
          onShowHistory={onShowHistory}
          numberingLocked={numberingLocked}
          onToggleLock={onToggleLock}
        />
      </div>

      <div className="flex items-center space-x-1">
        {/* Playback Controls - Everyone except members */}
        {canUseShowcaller && (
          <div className="flex items-center space-x-1 px-2 border-r border-gray-300 dark:border-gray-600">
            <PlaybackControls
              selectedRowId={selectedRowId}
              isPlaying={isPlaying}
              currentSegmentId={currentSegmentId}
              timeRemaining={timeRemaining}
              onPlay={onPlay}
              onPause={onPause}
              onForward={onForward}
              onBackward={onBackward}
              onReset={onReset}
              size="sm"
            />
          </div>
        )}

        {/* Autoscroll - Available to ALL roles */}
        {onToggleAutoScroll && (
          <div className="flex items-center space-x-1 px-2 border-r border-gray-300 dark:border-gray-600">
            <AutoScrollToggle
              autoScrollEnabled={autoScrollEnabled}
              onToggleAutoScroll={onToggleAutoScroll}
              onJumpToCurrentSegment={onJumpToCurrentSegment}
              size="sm"
            />
          </div>
        )}

        {/* Zoom Controls */}
        {onZoomIn && onZoomOut && onResetZoom && (
          <ZoomControls
            zoomLevel={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onResetZoom={onResetZoom}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            isDefaultZoom={isDefaultZoom}
            size="sm"
          />
        )}

        <ThemeToggle />
      </div>
    </div>
  );
};

export default DesktopToolbar;
