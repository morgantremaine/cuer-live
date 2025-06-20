
import React from 'react';
import { Clock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName: string;
  currentSegmentId: string | null;
  isPlaying?: boolean;
  timeRemaining?: string | null;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const SharedRundownHeader = ({ 
  title, 
  startTime, 
  timezone, 
  layoutName, 
  currentSegmentId, 
  isPlaying = false, 
  timeRemaining = null,
  isDark = false,
  onToggleTheme
}: SharedRundownHeaderProps) => {
  return (
    <div className={`border-b pb-4 mb-4 print:border-gray-400 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h1>
          <div className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Start Time: {startTime} ({timezone})</span>
            </div>
            <div>Layout: {layoutName}</div>
          </div>
        </div>
        
        {/* Dark mode toggle - only visible when not printing */}
        {onToggleTheme && (
          <div className="print:hidden">
            <ThemeToggle />
          </div>
        )}
      </div>
      
      {/* Showcaller status */}
      {isPlaying && currentSegmentId && (
        <div className={`flex items-center gap-2 text-sm p-2 rounded ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>Live - Currently playing</span>
          {timeRemaining && (
            <span className="ml-2 font-mono">
              {timeRemaining}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
