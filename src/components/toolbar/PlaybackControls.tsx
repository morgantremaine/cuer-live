
import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  size = 'default'
}: PlaybackControlsProps) => {
  const [hasBeenStarted, setHasBeenStarted] = useState(false);
  const [lastSegmentId, setLastSegmentId] = useState<string | null>(null);

  // Track when timer has been started for the current segment
  useEffect(() => {
    if (isPlaying && currentSegmentId) {
      setHasBeenStarted(true);
      setLastSegmentId(currentSegmentId);
    }
  }, [isPlaying, currentSegmentId]);

  // Reset the started state when segment changes or there's no segment, but only if not currently playing
  useEffect(() => {
    if (!currentSegmentId || (currentSegmentId !== lastSegmentId && lastSegmentId !== null && !isPlaying)) {
      setHasBeenStarted(false);
      setLastSegmentId(currentSegmentId);
    }
  }, [currentSegmentId, lastSegmentId, isPlaying]);

  const handlePlay = () => {
    if (selectedRowId) {
      onPlay(selectedRowId);
    } else {
      onPlay();
    }
  };

  const handleReset = () => {
    // Keep indicator and timer visible for current segment; only reset timer value upstream
    if (currentSegmentId) {
      setHasBeenStarted(true);
      setLastSegmentId(currentSegmentId);
    }
    onReset();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show timer when actively playing OR when paused after having been started
  const shouldShowTimer = currentSegmentId && (isPlaying || (hasBeenStarted && timeRemaining > 0));

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
        onClick={handleReset}
        variant="outline"
        size={size}
        className="flex items-center space-x-1"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PlaybackControls;
