
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import ShowcallerTimingIndicator from '../showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { RundownItem } from '@/types/rundown';
import { useClockFormat } from '@/contexts/ClockFormatContext';
import { parseTimeInput, isValidTimeInput } from '@/utils/timeInputParser';

interface HeaderBottomSectionProps {
  totalRuntime: string;
  rundownStartTime: string;
  rundownEndTime: string;
  timezone: string;
  onRundownStartTimeChange: (startTime: string) => void;
  onRundownEndTimeChange: (endTime: string) => void;
  items?: RundownItem[];
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
}

const HeaderBottomSection = ({
  totalRuntime,
  rundownStartTime,
  rundownEndTime,
  timezone,
  onRundownStartTimeChange,
  onRundownEndTimeChange,
  items = [],
  isPlaying = false,
  currentSegmentId = null,
  timeRemaining = 0
}: HeaderBottomSectionProps) => {
  const { formatTime } = useClockFormat();
  
  // Local state for the inputs to prevent external updates from interfering with typing
  const [localStartTime, setLocalStartTime] = useState(rundownStartTime);
  const [localEndTime, setLocalEndTime] = useState(rundownEndTime);
  const [isFocused, setIsFocused] = useState(false);
  const [isEndFocused, setIsEndFocused] = useState(false);

  // Get timing status from the showcaller timing hook
  const { isOnTime, isAhead, timeDifference, isVisible } = useShowcallerTiming({
    items,
    rundownStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining // Pass the timeRemaining value
  });

  // Update local state only when not focused and external value changes
  useEffect(() => {
    if (!isFocused) {
      setLocalStartTime(formatTime(rundownStartTime));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rundownStartTime, isFocused]);

  useEffect(() => {
    if (!isEndFocused) {
      setLocalEndTime(formatTime(rundownEndTime));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rundownEndTime, isEndFocused]);

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    // Allow free typing - parseTimeInput will handle validation on blur
    setLocalStartTime(newStartTime);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // When focused, set to formatted time so user can edit in current format
    setLocalStartTime(formatTime(rundownStartTime));
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Parse the input (handles both 12-hour and 24-hour formats)
    const validatedTime = parseTimeInput(localStartTime);
    
    // Update parent with validated 24-hour format
    onRundownStartTimeChange(validatedTime);
    // Update local state with formatted version for display
    setLocalStartTime(formatTime(validatedTime));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // This will trigger handleBlur
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndTime = e.target.value;
    setLocalEndTime(newEndTime);
  };

  const handleEndFocus = () => {
    setIsEndFocused(true);
    setLocalEndTime(formatTime(rundownEndTime));
  };

  const handleEndBlur = () => {
    setIsEndFocused(false);
    const validatedTime = parseTimeInput(localEndTime);
    onRundownEndTimeChange(validatedTime);
    setLocalEndTime(formatTime(validatedTime));
  };

  const handleEndKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Display calculated total runtime with proper formatting
  const displayRuntime = totalRuntime && totalRuntime !== '00:00:00' ? totalRuntime : '00:00:00';
  

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        <span className="opacity-75">Total Runtime: {displayRuntime}</span>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 opacity-75" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="opacity-75 text-xs">Start:</span>
              <input
                type="text"
                value={localStartTime}
                onChange={handleStartTimeChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 font-mono text-xs w-32 focus:outline-none focus:border-blue-500"
                placeholder="00:00:00"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="opacity-75 text-xs">End:</span>
              <input
                type="text"
                value={localEndTime}
                onChange={handleEndTimeChange}
                onFocus={handleEndFocus}
                onBlur={handleEndBlur}
                onKeyDown={handleEndKeyDown}
                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 font-mono text-xs w-32 focus:outline-none focus:border-blue-500"
                placeholder="00:00:00"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <ShowcallerTimingIndicator
          isOnTime={isOnTime}
          isAhead={isAhead}
          timeDifference={timeDifference}
          isVisible={isVisible}
        />
      </div>
    </div>
  );
};

export default HeaderBottomSection;
