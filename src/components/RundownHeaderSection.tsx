
import React from 'react';
import { RundownHeaderSectionProps } from '@/types/rundownContainer';

const RundownHeaderSection = (props: RundownHeaderSectionProps) => {
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
    <div className="mb-6">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center">
          {props.rundownIcon && (
            <img 
              src={props.rundownIcon} 
              alt="Rundown icon" 
              className="w-8 h-8 mr-3 rounded object-cover"
            />
          )}
          {props.rundownTitle}
        </h1>
        <div className="text-right text-sm text-gray-400">
          <div>{formatTime(props.currentTime, props.timezone)} {props.timezone.replace('_', ' ')}</div>
          <div>Start: {props.startTime}</div>
        </div>
      </div>
      
      {props.currentSegmentId && (
        <div className="bg-red-900/50 border-l-4 border-red-500 p-3">
          <div className="flex items-center">
            <div className="text-red-400 font-semibold mr-2">● LIVE</div>
            <div className="text-red-200">
              {props.items.find(item => item.id === props.currentSegmentId)?.name || 'Current Segment'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RundownHeaderSection;
