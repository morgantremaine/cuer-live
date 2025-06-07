
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
      // If a row is selected, play that row, otherwise play current segment
      if (selectedRowId) {
        onPlay(selectedRowId);
      } else if (currentSegmentId) {
        onPlay();
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {currentSegmentId && (
        <div className={`${
          isPlaying 
            ? 'bg-green-600 dark:bg-green-500 text-white animate-pulse' 
            : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
        } px-3 py-1 rounded-full font-mono text-xs border shadow-sm transition-all duration-300`}>
          {formatTime(timeRemaining)}
        </div>
      )}
      
      <Button
        onClick={onBackward}
        variant="outline"
        size={size}
        disabled={!currentSegmentId}
        title="Previous segment"
        className="transition-all hover:scale-105"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      
      <Button
        onClick={handlePlayPause}
        variant={isPlaying ? "default" : "outline"}
        size={size}
        disabled={!currentSegmentId && !selectedRowId}
        title={isPlaying ? "Pause" : "Play"}
        className={`transition-all hover:scale-105 ${
          isPlaying ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      
      <Button
        onClick={onForward}
        variant="outline"
        size={size}
        disabled={!currentSegmentId}
        title="Next segment"
        className="transition-all hover:scale-105"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PlaybackControls;
