
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
  icon?: string;
}

const SharedRundownHeader = ({ 
  title, 
  currentTime, 
  startTime, 
  currentSegmentId, 
  items,
  timezone = 'UTC',
  icon
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
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-2xl font-bold text-gray-900 print:text-xl flex items-center">
          {icon && (
            <img 
              src={icon} 
              alt="Rundown icon" 
              className="w-8 h-8 mr-3 rounded object-cover"
            />
          )}
          {title}
        </h1>
        <div className="text-right text-sm text-gray-600">
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
