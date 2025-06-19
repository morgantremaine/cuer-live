
import React from 'react';
import { Clock, MapPin, Monitor } from 'lucide-react';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: number;
  logoUrl?: string | null;
}

export const SharedRundownHeader = ({
  title,
  startTime,
  timezone,
  layoutName,
  currentSegmentId,
  isPlaying,
  timeRemaining,
  logoUrl
}: SharedRundownHeaderProps) => {
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-4 print:mb-2">
      <div className="flex items-center justify-between mb-2 print:mb-1">
        <div className="flex items-center space-x-3">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Rundown logo" 
              className="w-8 h-8 object-contain flex-shrink-0 print:w-6 print:h-6"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600 print:hidden">
          {isPlaying && currentSegmentId && (
            <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium">LIVE</span>
              <span>-{formatTimeRemaining(timeRemaining)}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Monitor className="w-4 h-4" />
            <span>{layoutName}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 print:text-xs">
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4 print:w-3 print:h-3" />
          <span>Start: {startTime}</span>
        </div>
        <div className="flex items-center space-x-1">
          <MapPin className="w-4 h-4 print:w-3 print:h-3" />
          <span>{timezone}</span>
        </div>
      </div>
    </div>
  );
};

export default SharedRundownHeader;
