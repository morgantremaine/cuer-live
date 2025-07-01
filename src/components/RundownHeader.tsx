import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns-tz';
import { TimezonePicker } from '@/components/TimezonePicker';
import PlaybackControls from './toolbar/PlaybackControls';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';

interface RundownHeaderProps {
  rundownTitle: string;
  rundownStartTime: string;
  timezone: string;
  currentTime: Date;
  totalRuntime: string;
  onTitleChange: (newTitle: string) => void;
  onStartTimeChange: (newStartTime: string) => void;
  onTimezoneChange: (newTimezone: string) => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  timingStatus: {
    isOnTime: boolean;
    isAhead: boolean;
    timeDifference: string;
    isVisible: boolean;
  } | null;
}

const RundownHeader = ({ 
  rundownTitle, 
  rundownStartTime, 
  timezone, 
  currentTime, 
  totalRuntime,
  onTitleChange,
  onStartTimeChange,
  onTimezoneChange,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  autoScrollEnabled,
  onToggleAutoScroll,
  timingStatus
}: RundownHeaderProps) => {
  const [localTime, setLocalTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedTime = useCallback(() => {
    try {
      return format(localTime, 'HH:mm:ss', { timeZone: timezone });
    } catch (error) {
      console.error("Error formatting time:", error);
      return 'Invalid Timezone';
    }
  }, [localTime, timezone]);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-50">
      <div className="flex flex-col space-y-4">
        {/* First row with title, times, etc. */}
        <div className="flex items-center space-x-4">
          {/* Title */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              type="text"
              id="title"
              className="w-64 text-lg font-bold"
              value={rundownTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          {/* Start Time */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="startTime" className="text-sm font-medium">
              Start Time
            </Label>
            <Input
              type="text"
              id="startTime"
              className="w-24"
              placeholder="HH:mm:ss"
              value={rundownStartTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
            />
          </div>

          {/* Timezone */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </Label>
            <TimezonePicker
              value={timezone}
              onChange={onTimezoneChange}
            />
          </div>

          {/* Current Time */}
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">
              Current Time
            </Label>
            <span className="font-mono text-sm">
              {formattedTime()}
            </span>
          </div>

          {/* Total Runtime */}
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">
              Total Runtime
            </Label>
            <span className="font-mono text-sm">
              {totalRuntime}
            </span>
          </div>
        </div>
        
        {/* Second row with playback controls and timing */}
        <div className="flex items-center justify-between">
          <PlaybackControls
            selectedRowId={selectedRowId}
            isPlaying={isPlaying}
            currentSegmentId={currentSegmentId}
            timeRemaining={timeRemaining}
            onPlay={onPlay}
            onPause={onPause}
            onForward={onForward}
            onBackward={onBackward}
            onReset={onReset}
            autoScrollEnabled={autoScrollEnabled}
            onToggleAutoScroll={onToggleAutoScroll}
          />
          
          {/* Timing indicator using new simplified structure */}
          {timingStatus && (
            <ShowcallerTimingIndicator
              isOnTime={timingStatus.isOnTime}
              isAhead={timingStatus.isAhead}
              timeDifference={timingStatus.timeDifference}
              isVisible={timingStatus.isVisible}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
