
import React from 'react';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';
import { Switch } from '@/components/ui/switch';
import { MapPin } from 'lucide-react';
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
  onOpenFindReplace?: () => void;
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
  onToggleAutoScroll,
  onOpenFindReplace
}: TabletToolbarProps) => {
  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-4 bg-card border-b border-border">
      {/* Top row - Main action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MainActionButtons
            onAddRow={onAddRow}
            onAddHeader={onAddHeader}
            onShowColumnManager={onShowColumnManager}
            onUndo={onUndo}
            canUndo={canUndo}
            lastAction={lastAction}
            rundownId={rundownId}
            onOpenTeleprompter={onOpenTeleprompter}
            rundownTitle={rundownTitle}
            rundownData={rundownData}
            autoScrollEnabled={autoScrollEnabled}
            onToggleAutoScroll={onToggleAutoScroll}
            onOpenFindReplace={onOpenFindReplace}
          />
        </div>
        
        {/* Auto-scroll toggle */}
        {onToggleAutoScroll && (
          <div className="flex items-center space-x-2">
            <MapPin className={`h-4 w-4 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className="text-sm text-muted-foreground">Auto-scroll</span>
            <Switch
              checked={autoScrollEnabled}
              onCheckedChange={handleToggleAutoScroll}
            />
          </div>
        )}
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
        />
      </div>
    </div>
  );
};

export default TabletToolbar;
