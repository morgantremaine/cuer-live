
import React from 'react';
import { Clock, Moon, Sun, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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
  autoScroll?: boolean;
  onToggleAutoScroll?: (enabled: boolean) => void;
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
  onToggleTheme,
  autoScroll = true,
  onToggleAutoScroll
}: SharedRundownHeaderProps) => {
  return (
    <div className={`pb-1 mb-1 ${isDark ? '' : ''}`}>
      <div className="flex justify-between items-start mb-1">
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
      
      {/* Showcaller status and auto-scroll toggle */}
      {isPlaying && currentSegmentId && (
        <div className={`flex items-center justify-between gap-4 text-sm p-2 rounded mb-2 ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Live - Currently playing</span>
            {timeRemaining && (
              <span className="ml-2 font-mono">
                {timeRemaining}
              </span>
            )}
          </div>
          
          {/* Auto-scroll toggle */}
          {onToggleAutoScroll && (
            <div className="flex items-center gap-2 print:hidden">
              <Navigation className="h-4 w-4" />
              <span className="text-xs">Follow playback</span>
              <Switch
                checked={autoScroll}
                onCheckedChange={onToggleAutoScroll}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
