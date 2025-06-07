
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface PlaybackControlsProps {
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  size?: 'sm' | 'lg';
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
  const handlePlay = () => {
    try {
      if (typeof onPlay === 'function') {
        onPlay(selectedRowId || undefined);
      } else {
        console.error('Play functionality needs to be wired through props');
      }
    } catch (error) {
      console.error('Error in play handler:', error);
    }
  };

  const handlePause = () => {
    try {
      if (typeof onPause === 'function') {
        onPause();
      } else {
        console.error('Pause functionality needs to be wired through props');
      }
    } catch (error) {
      console.error('Error in pause handler:', error);
    }
  };

  const handleForward = () => {
    try {
      if (typeof onForward === 'function') {
        onForward();
      } else {
        console.error('Forward functionality needs to be wired through props');
      }
    } catch (error) {
      console.error('Error in forward handler:', error);
    }
  };

  const handleBackward = () => {
    try {
      if (typeof onBackward === 'function') {
        onBackward();
      } else {
        console.error('Backward functionality needs to be wired through props');
      }
    } catch (error) {
      console.error('Error in backward handler:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonSize = size === 'lg' ? 'default' : 'sm';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleBackward}
        title="Previous segment"
      >
        <SkipBack className={iconSize} />
      </Button>
      
      <Button
        variant={isPlaying ? "destructive" : "default"}
        size={buttonSize}
        onClick={isPlaying ? handlePause : handlePlay}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className={iconSize} />
        ) : (
          <Play className={iconSize} />
        )}
      </Button>
      
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleForward}
        title="Next segment"
      >
        <SkipForward className={iconSize} />
      </Button>
      
      {size === 'lg' && (
        <div className="ml-4 text-sm font-mono">
          {formatTime(timeRemaining)}
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;
