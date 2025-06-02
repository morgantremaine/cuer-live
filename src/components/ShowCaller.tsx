
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ShowCallerProps {
  currentSegmentId: string | null;
  timeRemaining: number;
  totalDuration: number;
  isPlaying: boolean;
  currentSegmentName: string;
}

const ShowCaller = ({
  currentSegmentId,
  timeRemaining,
  totalDuration,
  isPlaying,
  currentSegmentName
}: ShowCallerProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;

  if (!currentSegmentId) {
    return null;
  }

  return (
    <div className="bg-card border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Show Caller</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-muted-foreground">
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Current: {currentSegmentName}</span>
          <span className="text-lg font-mono font-bold">
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>00:00</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export default ShowCaller;
