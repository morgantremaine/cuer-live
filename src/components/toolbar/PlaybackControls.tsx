
import React from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
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
  size = 'sm'
}: PlaybackControlsProps) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      // If a row is selected, play that row, otherwise play current segment or first
      if (selectedRowId) {
        onPlay(selectedRowId);
      } else {
        onPlay();
      }
    }
  };

  const handleForward = () => {
    onForward();
  };

  const handleBackward = () => {
    onBackward();
  };

  return (
    <div className="flex items-center space-x-1">
      {/* Always show timer when there's a current segment with valid time */}
      {currentSegmentId && timeRemaining >= 0 && (
        <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-1.5 py-0.5 rounded font-mono text-xs border min-w-[45px] text-center">
          {formatTime(timeRemaining)}
        </div>
      )}
      
      <Button
        onClick={handleBackward}
        variant="outline"
        size="sm"
        disabled={!currentSegmentId}
        title="Previous segment"
        className="h-7 w-7 p-0"
      >
        <SkipBack className="h-3 w-3" />
      </Button>
      
      <Button
        onClick={handlePlayPause}
        variant="outline"
        size="sm"
        title={isPlaying ? "Pause" : "Play"}
        className="h-7 w-7 p-0"
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-blue-500" />}
      </Button>
      
      <Button
        onClick={handleForward}
        variant="outline"
        size="sm"
        disabled={!currentSegmentId}
        title="Next segment"
        className="h-7 w-7 p-0"
      >
        <SkipForward className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default PlaybackControls;
