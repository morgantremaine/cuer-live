
import React from 'react';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';
import { CSVExportData } from '@/utils/csvExport';

interface TabletToolbarProps {
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
  onReset: () => void;
  rundownTitle?: string;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const TabletToolbar = ({
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
  onBackward,
  onReset,
  rundownTitle,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll
}: TabletToolbarProps) => {
  return (
    <div className="p-2 border-b bg-gray-50 dark:bg-gray-700">
      {/* Top row - Main actions */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-wrap gap-1">
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
            rundownTitle={rundownTitle}
            rundownData={rundownData}
          />
        </div>
        <ThemeToggle />
      </div>
      
      {/* Bottom row - Playback controls */}
      <div className="flex justify-center">
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
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={onToggleAutoScroll}
        />
      </div>
    </div>
  );
};

export default TabletToolbar;
