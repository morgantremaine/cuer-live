
import React from 'react';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';

interface DesktopToolbarProps {
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

const DesktopToolbar = ({
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
}: DesktopToolbarProps) => {
  return (
    <div className="p-3 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
      <div className="flex space-x-2">
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
          isMobile={false}
        />
      </div>

      <div className="flex items-center space-x-2">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2 px-2 border-r border-gray-300 dark:border-gray-600">
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
        </div>

        <ThemeToggle />
      </div>
    </div>
  );
};

export default DesktopToolbar;
