
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
  timezone: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: RundownItem[];
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
}

const HeaderBottomSection = ({
  totalRuntime,
  rundownStartTime,
  timezone,
  onRundownStartTimeChange,
  items = [],
  isPlaying = false,
  currentSegmentId = null,
  timeRemaining = 0
}: HeaderBottomSectionProps) => {
  const { formatTime } = useClockFormat();
  
  // Local state for the input to prevent external updates from interfering with typing
  const [localStartTime, setLocalStartTime] = useState(rundownStartTime);
  const [isFocused, setIsFocused] = useState(false);

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
  }, [rundownStartTime, isFocused, formatTime]);

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

  // Display calculated total runtime with proper formatting
  const displayRuntime = totalRuntime && totalRuntime !== '00:00:00' ? totalRuntime : '00:00:00';
  

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        <span className="opacity-75">Total Runtime: {displayRuntime}</span>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 opacity-75" />
          <span className="opacity-75">Start Time:</span>
          <input
            type="text"
            value={localStartTime}
            onChange={handleStartTimeChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 font-mono text-sm w-32 focus:outline-none focus:border-blue-500"
            placeholder="00:00:00"
          />
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
