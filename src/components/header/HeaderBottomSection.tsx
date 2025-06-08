
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface HeaderBottomSectionProps {
  totalRuntime: string;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
}

const HeaderBottomSection = ({
  totalRuntime,
  rundownStartTime,
  onRundownStartTimeChange
}: HeaderBottomSectionProps) => {
  // Local state for the input to prevent external updates from interfering with typing
  const [localStartTime, setLocalStartTime] = useState(rundownStartTime);
  const [isFocused, setIsFocused] = useState(false);

  // Update local state only when not focused and external value changes
  useEffect(() => {
    if (!isFocused) {
      setLocalStartTime(rundownStartTime);
    }
  }, [rundownStartTime, isFocused]);

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    console.log('⏰ HeaderBottomSection: Start time change requested:', { from: rundownStartTime, to: newStartTime });
    setLocalStartTime(newStartTime);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Only call the parent handler on blur to avoid constant updates
    if (localStartTime !== rundownStartTime) {
      onRundownStartTimeChange(localStartTime);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // This will trigger handleBlur
    }
  };

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center space-x-4">
        <span className="opacity-75">Total Runtime: {totalRuntime}</span>
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
            className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 font-mono text-sm w-24 focus:outline-none focus:border-blue-500"
            placeholder="00:00:00"
          />
        </div>
      </div>
    </div>
  );
};

export default HeaderBottomSection;
