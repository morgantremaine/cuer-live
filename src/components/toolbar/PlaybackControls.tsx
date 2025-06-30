
import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface PlaybackControlsProps {
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  size?: 'sm' | 'default';
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const PlaybackControls = ({
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  size = 'default',
  autoScrollEnabled = false,
  onToggleAutoScroll
}: PlaybackControlsProps) => {
  const handlePlay = () => {
    if (selectedRowId) {
      onPlay(selectedRowId);
    } else {
      onPlay();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  // Show timer only when actively playing OR when paused after having been played
  // (timeRemaining < total duration indicates it has been started)
  const shouldShowTimer = currentSegmentId && (isPlaying || (!isPlaying && timeRemaining > 0 && timeRemaining < 300)); // assuming max 5min segments

  return (
    <div className="flex items-center space-x-1">
      <Button
        onClick={onBackward}
        variant="outline"
        size={size}
        className="flex items-center space-x-1"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      
      <Button
        onClick={isPlaying ? onPause : handlePlay}
        variant="outline"
        size={size}
        className="flex items-center space-x-1"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {shouldShowTimer && (
          <span className="text-xs font-mono">{formatTime(timeRemaining)}</span>
        )}
      </Button>
      
      <Button
        onClick={onForward}
        variant="outline"
        size={size}
        className="flex items-center space-x-1"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
      
      <Button
        onClick={onReset}
        variant="outline"
        size={size}
        className="flex items-center space-x-1"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Autoscroll Toggle */}
      {onToggleAutoScroll && (
        <div className={`flex items-center space-x-1.5 px-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ml-2 ${
          size === 'sm' ? 'h-9' : 'h-10'
        }`}>
          <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
          <Switch
            checked={autoScrollEnabled}
            onCheckedChange={handleToggleAutoScroll}
            className="scale-75"
          />
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;
