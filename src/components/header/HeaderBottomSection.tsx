
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

  // Validate time format
  const validateTimeInput = (timeString: string): string => {
    // Remove any non-time characters
    let cleanTime = timeString.replace(/[^0-9:]/g, '');
    
    // If it's a valid time format, return it
    if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(cleanTime)) {
      const parts = cleanTime.split(':');
      const hours = Math.min(23, Math.max(0, parseInt(parts[0]) || 0)).toString().padStart(2, '0');
      const minutes = Math.min(59, Math.max(0, parseInt(parts[1]) || 0)).toString().padStart(2, '0');
      const seconds = Math.min(59, Math.max(0, parseInt(parts[2]) || 0)).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    // Return original if not valid
    return cleanTime;
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    console.log('⏰ HeaderBottomSection: Start time input change:', { from: localStartTime, to: newStartTime });
    setLocalStartTime(newStartTime);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const validatedTime = validateTimeInput(localStartTime);
    console.log('⏰ HeaderBottomSection: Start time blur - submitting:', { input: localStartTime, validated: validatedTime });
    
    // Always call the parent handler with validated time
    onRundownStartTimeChange(validatedTime);
    setLocalStartTime(validatedTime);
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
            className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 font-mono text-sm w-24 focus:outline-none focus:border-blue-500"
            placeholder="00:00:00"
          />
        </div>
      </div>
    </div>
  );
};

export default HeaderBottomSection;
