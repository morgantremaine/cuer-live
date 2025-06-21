
import React from 'react';
import { Clock, Users, Globe } from 'lucide-react';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { RundownItem } from '@/types/rundown';

interface RundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  currentTime: Date;
  totalRuntime: string;
  items: RundownItem[];
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
}

const RundownHeader = ({
  title,
  startTime,
  timezone,
  currentTime,
  totalRuntime,
  items,
  currentSegmentId,
  isPlaying,
  timeRemaining
}: RundownHeaderProps) => {
  // Get showcaller timing status
  const timingStatus = useShowcallerTiming({
    items,
    rundownStartTime: startTime,
    isPlaying,
    currentSegmentId,
    timeRemaining
  });

  const formatCurrentTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {title}
        </h1>
        
        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Start: {startTime}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Runtime: {totalRuntime}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>{timezone}</span>
          </div>
        </div>
      </div>

      {/* Current Time and Showcaller Timing */}
      <div className="flex items-center justify-center space-x-6">
        {/* Showcaller Timing Indicator */}
        <ShowcallerTimingIndicator
          isOnTime={timingStatus.isOnTime}
          isAhead={timingStatus.isAhead}
          timeDifference={timingStatus.timeDifference}
          isVisible={timingStatus.isVisible}
        />
        
        {/* Current Time Display */}
        <div className="flex items-center space-x-2 text-3xl font-mono font-bold text-gray-900 dark:text-white">
          <Clock className="h-8 w-8" />
          <span>{formatCurrentTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
