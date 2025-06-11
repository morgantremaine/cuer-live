
import React from 'react';
import { format } from 'date-fns';
import { RundownItem } from '@/types/rundown';

interface SharedRundownHeaderProps {
  title: string;
  currentTime: Date;
  startTime: string;
  currentSegmentId?: string | null;
  items: RundownItem[];
  timezone: string;
  isPlaying?: boolean;
  timeRemaining?: number;
}

const SharedRundownHeader = ({
  title,
  currentTime,
  startTime,
  currentSegmentId,
  items,
  timezone,
  isPlaying = false,
  timeRemaining = 0
}: SharedRundownHeaderProps) => {
  const currentItem = currentSegmentId ? items.find(item => item.id === currentSegmentId) : null;
  
  // Format time remaining for display
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-6 border-b pb-4 print:pb-2 print:mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">{title}</h1>
          <div className="mt-2 text-sm text-gray-600 print:text-xs">
            <div>Start Time: {startTime} ({timezone})</div>
          </div>
        </div>
        
        {/* Hide time of day and showcaller in print view */}
        <div className="text-right print:hidden">
          <div className="text-sm text-gray-600">
            <div>Current Time: {format(currentTime, 'HH:mm:ss')}</div>
            <div>Timezone: {timezone}</div>
          </div>
          
          {/* Showcaller status - only show on screen */}
          {currentItem && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
              <div className="font-semibold">
                {isPlaying ? '▶️ LIVE' : '⏸️ PAUSED'}: {currentItem.segmentName || currentItem.name}
              </div>
              {isPlaying && timeRemaining > 0 && (
                <div className="text-xs text-gray-600">
                  Time Remaining: {formatTimeRemaining(timeRemaining)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedRundownHeader;
