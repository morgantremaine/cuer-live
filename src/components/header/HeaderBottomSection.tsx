
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import ShowcallerTimingIndicator from '../showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { RundownItem } from '@/types/rundown';

import { extractTimeFromISO, createDateTimeString } from '@/utils/timeUtils';
import { DatePickerOnly } from '@/components/ui/date-picker-only';
import { Input } from '@/components/ui/input';

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
  const [localTime, setLocalTime] = useState(extractTimeFromISO(rundownStartTime));

  // Get timing status from the showcaller timing hook
  const { isOnTime, isAhead, timeDifference, isVisible } = useShowcallerTiming({
    items,
    rundownStartTime: localStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining // Pass the timeRemaining value
  });

  // Update local state when external value changes
  useEffect(() => {
    setLocalStartTime(rundownStartTime);
    setLocalTime(extractTimeFromISO(rundownStartTime));
  }, [rundownStartTime]);

  // Display calculated total runtime with proper formatting
  const displayRuntime = totalRuntime && totalRuntime !== '00:00:00' ? totalRuntime : '00:00:00';
  

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        <span className="opacity-75">Total Runtime: {displayRuntime}</span>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 opacity-75" />
          <span className="opacity-75">Start:</span>
          <DatePickerOnly
            date={new Date(localStartTime)}
            onDateChange={(d) => {
              const newISO = createDateTimeString(d, extractTimeFromISO(localStartTime));
              setLocalStartTime(newISO);
              onRundownStartTimeChange(newISO);
            }}
            className="bg-transparent text-sm font-mono"
          />
          <Input
            type="text"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            onBlur={() => {
              // Normalize to HH:MM
              let formatted = localTime.replace(/[^0-9:]/g, '');
              const parts = formatted.split(':');
              let hours = parts[0] || '00';
              if (hours.length === 1) hours = '0' + hours;
              if (parseInt(hours) > 23) hours = '23';
              let minutes = parts[1] || '00';
              if (minutes.length === 1) minutes = '0' + minutes;
              if (parseInt(minutes) > 59) minutes = '59';
              formatted = `${hours}:${minutes}`;
              setLocalTime(formatted);
              const newISO = createDateTimeString(new Date(localStartTime), formatted);
              setLocalStartTime(newISO);
              onRundownStartTimeChange(newISO);
            }}
            placeholder="HH:MM"
            className="w-[110px] text-sm font-mono"
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
