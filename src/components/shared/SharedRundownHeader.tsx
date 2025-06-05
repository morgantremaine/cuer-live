
import React from 'react';
import { RundownItem } from '@/types/rundown';

interface SharedRundownHeaderProps {
  title: string;
  currentTime: Date;
  startTime: string;
  currentSegmentId: string | null;
  items: RundownItem[];
  timezone?: string;
}

const SharedRundownHeader = ({ 
  title, 
  currentTime, 
  startTime, 
  timezone = 'UTC'
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
          </div>
        </div>
      </div>

      {/* Desktop layout: Logo, title, and time in a row */}
      <div className="hidden sm:flex sm:justify-between sm:items-start mb-2">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/da2200e5-3194-4f43-8ec0-9266a479bbf0.png" 
            alt="Cuer Logo" 
            className="h-6 w-auto flex-shrink-0"
          />
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl break-words min-w-0">
            {title}
          </h1>
        </div>
        <div className="text-right text-sm text-gray-600 flex-shrink-0 print:hidden">
          <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
          <div>Start: {startTime}</div>
        </div>
      </div>
    </div>
  );
};

export default SharedRundownHeader;
