
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import ShowcallerTimingIndicator from '../showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { RundownItem } from '@/types/rundown';
import { useClockFormat } from '@/contexts/ClockFormatContext';
import { parseTimeInput, isValidTimeInput } from '@/utils/timeInputParser';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface TimeState {
  value: string;
  isEditing: boolean;
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
  
  // State for popover
  const [isTimePopoverOpen, setIsTimePopoverOpen] = useState(false);
  
  // Local state for start time input
  const [startTimeState, setStartTimeState] = useState<TimeState>({
    value: formatTime(rundownStartTime),
    isEditing: false
  });
  
  // Local state for end time input (initialize to empty for now)
  const [endTimeState, setEndTimeState] = useState<TimeState>({
    value: '',
    isEditing: false
  });

  // Get timing status from the showcaller timing hook
  const { isOnTime, isAhead, timeDifference, isVisible } = useShowcallerTiming({
    items,
    rundownStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining
  });

  // Update start time state when rundownStartTime changes (but not while editing)
  useEffect(() => {
    if (!startTimeState.isEditing) {
      setStartTimeState(prev => ({
        ...prev,
        value: formatTime(rundownStartTime)
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rundownStartTime, startTimeState.isEditing]);

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTimeState(prev => ({
      ...prev,
      value: e.target.value
    }));
  };

  const handleStartTimeFocus = () => {
    setStartTimeState(prev => ({
      ...prev,
      isEditing: true,
      value: formatTime(rundownStartTime)
    }));
  };

  const handleStartTimeBlur = () => {
    const validatedTime = parseTimeInput(startTimeState.value);
    onRundownStartTimeChange(validatedTime);
    setStartTimeState({
      value: formatTime(validatedTime),
      isEditing: false
    });
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTimeState(prev => ({
      ...prev,
      value: e.target.value
    }));
  };

  const handleEndTimeFocus = () => {
    setEndTimeState(prev => ({
      ...prev,
      isEditing: true
    }));
  };

  const handleEndTimeBlur = () => {
    const validatedTime = parseTimeInput(endTimeState.value);
    setEndTimeState({
      value: validatedTime ? formatTime(validatedTime) : '',
      isEditing: false
    });
    // Note: End time doesn't affect rundown yet - will add functionality later
  };

  const handleEndTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          <span className="opacity-75">Time Range:</span>
          <Popover open={isTimePopoverOpen} onOpenChange={setIsTimePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 px-3 font-mono text-sm justify-start hover:bg-accent/50",
                  "bg-transparent border-border/50"
                )}
              >
                {startTimeState.value || '00:00:00'}
                {endTimeState.value && ` - ${endTimeState.value}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <input
                    type="text"
                    value={startTimeState.value}
                    onChange={handleStartTimeChange}
                    onFocus={handleStartTimeFocus}
                    onBlur={handleStartTimeBlur}
                    onKeyDown={handleStartTimeKeyDown}
                    className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                    placeholder="00:00:00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <input
                    type="text"
                    value={endTimeState.value}
                    onChange={handleEndTimeChange}
                    onFocus={handleEndTimeFocus}
                    onBlur={handleEndTimeBlur}
                    onKeyDown={handleEndTimeKeyDown}
                    className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                    placeholder="00:00:00"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
