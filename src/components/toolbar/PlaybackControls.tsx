
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
    console.log('🎮 PlaybackControls - Play/Pause clicked', { isPlaying, selectedRowId, currentSegmentId });
    
    if (isPlaying) {
      onPause();
    } else {
      // If a row is selected, play that row, otherwise play current segment or first
      if (selectedRowId) {
        console.log('🎮 Playing selected row:', selectedRowId);
        onPlay(selectedRowId);
      } else {
        console.log('🎮 Playing from current state');
        onPlay();
      }
    }
  };

  const handleForward = () => {
    console.log('🎮 PlaybackControls - Forward clicked');
    onForward();
  };

  const handleBackward = () => {
    console.log('🎮 PlaybackControls - Backward clicked');
    onBackward();
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Always show timer when there's a current segment */}
      {currentSegmentId && (
        <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-2 py-1 rounded font-mono text-xs border min-w-[50px] text-center">
          {formatTime(timeRemaining)}
        </div>
      )}
      
      <Button
        onClick={handleBackward}
        variant="outline"
        size={size}
        disabled={!currentSegmentId}
        title="Previous segment"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      
      <Button
        onClick={handlePlayPause}
        variant="outline"
        size={size}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-blue-500" />}
      </Button>
      
      <Button
        onClick={handleForward}
        variant="outline"
        size={size}
        disabled={!currentSegmentId}
        title="Next segment"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PlaybackControls;
