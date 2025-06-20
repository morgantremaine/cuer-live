
import React from 'react';
import { Clock, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className={`pb-2 mb-2 ${isDark ? '' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="h-9 w-9"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Showcaller status */}
      {isPlaying && currentSegmentId && (
        <div className={`flex items-center gap-2 text-sm p-2 rounded mb-2 ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
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
