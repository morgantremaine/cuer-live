
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, Clipboard, Undo, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PlaybackControls from './toolbar/PlaybackControls';
import { useTheme } from '@/hooks/useTheme';

interface RundownToolbarProps {
  selectedCount: number;
  hasClipboardData: boolean;
  onAddRow: () => void;
  onAddHeader: () => void;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction?: string;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onOpenColumnManager: () => void;
}

const RundownToolbar = ({
  selectedCount,
  hasClipboardData,
  onAddRow,
  onAddHeader,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection,
  onUndo,
  canUndo,
  lastAction,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onOpenColumnManager
}: RundownToolbarProps) => {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-b bg-white dark:bg-gray-900">
      {/* Playback Controls - Always visible */}
      <div className="flex items-center gap-2">
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

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Add Buttons */}
      <div className="flex items-center gap-2">
        <Button onClick={onAddRow} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
        
        <Button onClick={onAddHeader} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Header
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

      {/* Selection Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedCount} selected
          </Badge>
          
          <Button onClick={onCopySelectedRows} size="sm" variant="outline">
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          
          <Button onClick={onDeleteSelectedRows} size="sm" variant="outline">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          
          <Button onClick={onClearSelection} size="sm" variant="ghost">
            Clear
          </Button>
        </div>
      )}

      {/* Clipboard Actions */}
      {hasClipboardData && (
        <Button onClick={onPasteRows} size="sm" variant="outline">
          <Clipboard className="h-4 w-4 mr-1" />
          Paste
        </Button>
      )}

      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <Button 
          onClick={onUndo} 
          size="sm" 
          variant="outline" 
          disabled={!canUndo}
          title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
        >
          <Undo className="h-4 w-4 mr-1" />
          Undo
        </Button>

        {/* Column Manager */}
        <Button onClick={onOpenColumnManager} size="sm" variant="outline">
          <Settings className="h-4 w-4 mr-1" />
          Columns
        </Button>
      </div>
    </div>
  );
};

export default RundownToolbar;
