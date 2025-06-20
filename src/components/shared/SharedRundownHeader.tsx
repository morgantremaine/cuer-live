
import React from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: string | null;
}

export const SharedRundownHeader = ({
  title,
  startTime,
  timezone,
  layoutName,
  currentSegmentId,
  isPlaying,
  timeRemaining
}: SharedRundownHeaderProps) => {
  return (
    <div className="mb-4 print:mb-2">
      {/* Header with title and theme toggle */}
      <div className="flex justify-between items-center mb-4 print:mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground print:text-black print:text-xl">
            {title}
          </h1>
          <div className="text-sm text-muted-foreground print:text-gray-600">
            Start Time: {startTime} ({timezone}) • Layout: {layoutName}
          </div>
        </div>
        <div className="print:hidden">
          <ThemeToggle />
        </div>
      </div>

      {/* Showcaller status indicator */}
      {currentSegmentId && (
        <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-lg mb-4 print:hidden print:bg-gray-100 print:border-gray-300">
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <Play className="h-4 w-4 text-green-600 fill-green-600" />
            ) : (
              <Pause className="h-4 w-4 text-yellow-600" />
            )}
            <span className="font-medium text-foreground">
              Showcaller: {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
          
          {timeRemaining && (
            <div className="flex items-center gap-1 ml-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Time remaining: {timeRemaining}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
