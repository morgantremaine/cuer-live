
import React from 'react';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';

interface MobileToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
}

const MobileToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  rundownId,
  onOpenTeleprompter,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward
}: MobileToolbarProps) => {
  return (
    <div className="p-3 border-b bg-gray-50 dark:bg-gray-700">
      {/* First row - Main action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <MainActionButtons
          onAddRow={onAddRow}
          onAddHeader={onAddHeader}
          onShowColumnManager={onShowColumnManager}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
          rundownId={rundownId}
          onOpenTeleprompter={onOpenTeleprompter}
          selectedRowId={selectedRowId}
          isMobile={true}
        />
      </div>

      {/* Second row - Playback controls and theme toggle */}
      <div className="flex items-center justify-between">
        <PlaybackControls
          selectedRowId={selectedRowId}
          isPlaying={isPlaying}
          currentSegmentId={currentSegmentId}
          timeRemaining={timeRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onForward={onForward}
          onBackward={onBackward}
          size="sm"
        />
        <ThemeToggle />
      </div>
    </div>
  );
};

export default MobileToolbar;
