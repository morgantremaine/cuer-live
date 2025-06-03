
import React from 'react';
import { Plus, Settings, Play, Pause, SkipForward, SkipBack, Share2, Monitor, FileText, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

interface RundownToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  // Playback controls
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  // Share functionality
  rundownId: string | undefined;
  // Teleprompter functionality
  onOpenTeleprompter: () => void;
  // Undo functionality
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
}

const RundownToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  rundownId,
  onOpenTeleprompter,
  onUndo,
  canUndo,
  lastAction
}: RundownToolbarProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      // If a row is selected, play that row, otherwise play current segment
      if (selectedRowId) {
        onPlay(selectedRowId);
      } else if (currentSegmentId) {
        onPlay();
      }
    }
  };

  const handleShareRundown = () => {
    if (!rundownId) {
      toast({
        title: "Cannot share rundown",
        description: "Save this rundown first before sharing.",
        variant: "destructive"
      });
      return;
    }

    const shareUrl = `${window.location.origin}/shared/rundown/${rundownId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Share link copied!",
        description: "Read-only rundown URL has been copied to clipboard",
        variant: "default"
      });
    });
  };

  const handleOpenBlueprint = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open blueprint",
        description: "Save this rundown first before opening blueprint.",
        variant: "destructive"
      });
      return;
    }

    navigate(`/blueprint/${rundownId}`);
  };

  if (isMobile) {
    return (
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-700">
        {/* First row - Main action buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Button onClick={onAddRow} variant="outline" size="sm" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Segment</span>
          </Button>
          <Button onClick={onAddHeader} variant="outline" size="sm" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Header</span>
          </Button>
          <Button onClick={onShowColumnManager} variant="outline" size="sm" className="flex items-center space-x-1">
            <Settings className="h-4 w-4" />
            <span>Columns</span>
          </Button>
          <Button 
            onClick={onUndo} 
            variant="outline" 
            size="sm" 
            disabled={!canUndo}
            title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
            className="flex items-center space-x-1"
          >
            <Undo className="h-4 w-4" />
            <span>Undo</span>
          </Button>
          <Button onClick={handleShareRundown} variant="outline" size="sm" className="flex items-center space-x-1">
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          <Button onClick={onOpenTeleprompter} variant="outline" size="sm" className="flex items-center space-x-1">
            <Monitor className="h-4 w-4" />
            <span>Teleprompter</span>
          </Button>
          <Button onClick={handleOpenBlueprint} variant="outline" size="sm" className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>Blueprint</span>
          </Button>
        </div>

        {/* Second row - Playback controls and theme toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentSegmentId && (
              <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded font-mono text-xs border">
                {formatTime(timeRemaining)}
              </div>
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
              onClick={handlePlayPause}
              variant="outline"
              size="sm"
              disabled={!currentSegmentId && !selectedRowId}
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

          <ThemeToggle />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="p-3 border-b bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
      <div className="flex space-x-2">
        <Button onClick={onAddRow} variant="outline" className="flex items-center space-x-2">
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
        <Button 
          onClick={onUndo} 
          variant="outline" 
          disabled={!canUndo}
          title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
          className="flex items-center space-x-2"
        >
          <Undo className="h-4 w-4" />
          <span>Undo</span>
        </Button>
        <Button onClick={handleShareRundown} variant="outline" className="flex items-center space-x-2">
          <Share2 className="h-4 w-4" />
          <span>Share Rundown</span>
        </Button>
        <Button onClick={onOpenTeleprompter} variant="outline" className="flex items-center space-x-2">
          <Monitor className="h-4 w-4" />
          <span>Teleprompter</span>
        </Button>
        <Button onClick={handleOpenBlueprint} variant="outline" className="flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>Blueprint</span>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2 px-2 border-r border-gray-300 dark:border-gray-600">
          {currentSegmentId && (
            <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-3 py-1 rounded font-mono text-sm border">
              {formatTime(timeRemaining)}
            </div>
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
            onClick={handlePlayPause}
            variant="outline"
            size="sm"
            disabled={!currentSegmentId && !selectedRowId}
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

        <ThemeToggle />
      </div>
    </div>
  );
};

export default RundownToolbar;
