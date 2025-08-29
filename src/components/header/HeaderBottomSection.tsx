
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import ShowcallerTimingIndicator from '../showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { RundownItem } from '@/types/rundown';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { extractTimeFromISO } from '@/utils/timeUtils';

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
  // Local state for the input to prevent external updates from interfering with typing
  const [localStartTime, setLocalStartTime] = useState(rundownStartTime);

  // Get timing status from the showcaller timing hook
  const { isOnTime, isAhead, timeDifference, isVisible } = useShowcallerTiming({
    items,
    rundownStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining // Pass the timeRemaining value
  });

  // Update local state when external value changes
  useEffect(() => {
    setLocalStartTime(rundownStartTime);
  }, [rundownStartTime]);

  // Display calculated total runtime with proper formatting
  const displayRuntime = totalRuntime && totalRuntime !== '00:00:00' ? totalRuntime : '00:00:00';
  

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        <span className="opacity-75">Total Runtime: {displayRuntime}</span>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 opacity-75" />
          <span className="opacity-75">Start Time:</span>
          <DateTimePicker
            value={localStartTime}
            onValueChange={(isoDateTime) => {
              const timeOnly = extractTimeFromISO(isoDateTime);
              setLocalStartTime(timeOnly);
              onRundownStartTimeChange(timeOnly);
            }}
            className="bg-transparent text-sm font-mono"
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
