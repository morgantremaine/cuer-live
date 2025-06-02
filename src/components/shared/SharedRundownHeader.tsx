
import React from 'react';
import { format } from 'date-fns';
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
  currentSegmentId, 
  items,
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 space-y-2 sm:space-y-0">
        {/* Mobile: Logo and time info, Desktop: Logo and title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
          <div className="flex justify-between items-center sm:block">
            <img 
              src="/lovable-uploads/da2200e5-3194-4f43-8ec0-9266a479bbf0.png" 
              alt="Cuer Logo" 
              className="h-6 w-auto flex-shrink-0"
            />
            {/* Time info only on mobile */}
            <div className="text-right text-sm text-gray-600 sm:hidden">
              <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
              <div>Start: {startTime}</div>
            </div>
          </div>
          
          {/* Title below logo on mobile, next to logo on desktop */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 print:text-xl break-words min-w-0 mt-2 sm:mt-0">
            {title}
          </h1>
        </div>
        
        {/* Time info only on desktop */}
        <div className="hidden sm:block text-right text-sm text-gray-600 flex-shrink-0">
          <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
          <div>Start: {startTime}</div>
        </div>
      </div>
      
      {currentSegmentId && (
        <div className="bg-red-100 border-l-4 border-red-500 p-3 print:p-2">
          <div className="flex items-center">
            <div className="text-red-600 font-semibold mr-2">● LIVE</div>
            <div className="text-red-800">
              {items.find(item => item.id === currentSegmentId)?.name || 'Current Segment'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedRundownHeader;
