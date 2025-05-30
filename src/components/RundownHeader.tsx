
import React, { useState } from 'react';
import { Play, Edit2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimezoneSelector from './TimezoneSelector';
import { ClockFormat } from '@/hooks/useClockFormat';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  clockFormat: ClockFormat;
  onClockFormatToggle: () => void;
}

const RundownHeader = ({ 
  currentTime, 
  timezone, 
  onTimezoneChange, 
  totalRuntime, 
  clockFormat, 
  onClockFormatToggle 
}: RundownHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('Live Broadcast Rundown');

  const formatTime = (time: Date, tz: string) => {
    try {
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: clockFormat === '12',
        timeZone: tz
      });
      return timeString;
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: clockFormat === '12' });
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <Play className="h-6 w-6" />
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              className="text-xl font-bold bg-transparent border-b-2 border-white outline-none text-white placeholder-white"
              autoFocus
            />
          ) : (
            <div className="flex items-center space-x-2 group">
              <h1 className="text-xl font-bold">{title}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-lg font-mono">{formatTime(currentTime, timezone)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClockFormatToggle}
            className="text-white hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-1"
            title={`Switch to ${clockFormat === '12' ? '24' : '12'}-hour format`}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">{clockFormat}H</span>
          </Button>
          <TimezoneSelector 
            currentTimezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
        </div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="opacity-75">Total Runtime: {totalRuntime}</span>
        <span className="opacity-75">{timezone.replace('_', ' ')}</span>
      </div>
    </div>
  );
};

export default RundownHeader;
