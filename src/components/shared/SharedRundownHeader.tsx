
import React from 'react';
import { RundownItem } from '@/types/rundown';

interface SharedRundownHeaderProps {
  title: string;
  currentTime: Date;
  startTime: string;
  currentSegmentId: string | null;
  items: RundownItem[];
  timezone?: string;
  isPlaying?: boolean;
  timeRemaining?: number;
}

const SharedRundownHeader = ({ 
  title, 
  currentTime, 
  startTime, 
  timezone = 'UTC',
  isPlaying = false,
  timeRemaining = 0
}: SharedRundownHeaderProps) => {
  const formatTime = (time: Date, tz: string) => {
    try {
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: false,
        timeZone: tz
      });
      return timeString;
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: false });
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-6 print:mb-4">
      {/* Mobile layout: Compact single column */}
      <div className="block sm:hidden">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900 print:text-xl line-clamp-2 leading-tight mb-1">
            {title}
          </h1>
          <div className="text-xs text-gray-600 space-y-0.5 print:hidden">
            <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
            <div>Start: {startTime}</div>
            {isPlaying && (
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-semibold">▶ LIVE</span>
                <span>Time remaining: {formatTimeRemaining(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop layout: Logo, title, and time in a row */}
      <div className="hidden sm:flex sm:justify-between sm:items-start mb-2">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/c651349b-4259-451e-8648-9e8a329145c6.png" 
            alt="Cuer Logo" 
            className="h-8 w-auto flex-shrink-0"
          />
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl break-words min-w-0">
            {title}
          </h1>
        </div>
        <div className="text-right text-sm text-gray-600 flex-shrink-0 print:hidden">
          <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
          <div>Start: {startTime}</div>
          {isPlaying && (
            <div className="flex items-center justify-end space-x-2 mt-1">
              <span className="text-blue-600 font-semibold">▶ LIVE</span>
              <span>Time remaining: {formatTimeRemaining(timeRemaining)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedRundownHeader;
