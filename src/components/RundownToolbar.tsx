
import React from 'react';
import { Plus, Settings, Copy, Clipboard, Trash2, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';

interface RundownToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  // Playback controls
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
}

const RundownToolbar = ({
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
  onBackward
}: RundownToolbarProps) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (selectedRowId && selectedCount === 1) {
      onPlay(selectedRowId);
    } else if (currentSegmentId) {
      onPlay();
    }
  };

  return (
    <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
      <div className="flex space-x-2">
        <Button onClick={onAddRow} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Segment</span>
        </Button>
        <Button onClick={onAddHeader} variant="outline" className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Header</span>
        </Button>
        <Button onClick={onShowColumnManager} variant="outline" className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Manage Columns</span>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2 px-2 border-r border-gray-300 dark:border-gray-600">
          {currentSegmentId && (
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {formatTime(timeRemaining)}
            </span>
          )}
          
          <Button
            onClick={onBackward}
            variant="outline"
            size="sm"
            disabled={!currentSegmentId}
            title="Previous segment"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={isPlaying ? onPause : handlePlay}
            variant="outline"
            size="sm"
            disabled={!currentSegmentId && (!selectedRowId || selectedCount !== 1)}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            onClick={onForward}
            variant="outline"
            size="sm"
            disabled={!currentSegmentId}
            title="Next segment"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {selectedCount > 0 && (
          <>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedCount} selected
            </span>
            <Button onClick={onCopySelectedRows} variant="outline" size="sm">
              <Copy className="h-4 w-4" />
            </Button>
            {hasClipboardData && (
              <Button onClick={onPasteRows} variant="outline" size="sm">
                <Clipboard className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={onDeleteSelectedRows} variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={onClearSelection} variant="ghost" size="sm">
              Clear
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
};

export default RundownToolbar;
