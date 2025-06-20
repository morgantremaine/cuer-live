
import React from 'react';
import { Clock, Palette, Sun, Moon, Play, Pause, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface SharedRundownHeaderProps {
  title: string;
  startTime: string;
  timezone: string;
  layoutName: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  timeRemaining: string;
  isDark: boolean;
  onToggleTheme: () => void;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

export const SharedRundownHeader = ({
  title,
  startTime,
  timezone,
  layoutName,
  currentSegmentId,
  isPlaying,
  timeRemaining,
  isDark,
  onToggleTheme,
  autoScrollEnabled = false,
  onToggleAutoScroll
}: SharedRundownHeaderProps) => {
  return (
    <div className={`border-b print:border-gray-400 ${
      isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
    }`}>
      <div className="px-4 py-3 print:px-2 print:py-1">
        <div className="flex flex-col space-y-3 print:space-y-1">
          {/* Title and Controls Row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-xl font-bold print:text-base ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h1>
              <p className={`text-sm print:text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {layoutName}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 print:hidden">
              {/* Autoscroll Toggle */}
              {onToggleAutoScroll && (
                <div className={`flex items-center space-x-1.5 px-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground ${
                  isDark ? 'border-gray-600' : 'border-gray-300'
                } h-9`}>
                  <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Switch
                    checked={autoScrollEnabled}
                    onCheckedChange={onToggleAutoScroll}
                    className="scale-75"
                  />
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleTheme}
                className={`${
                  isDark 
                    ? 'border-gray-600 hover:bg-gray-700' 
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Status Information Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4 text-sm print:text-xs">
              <div className={`flex items-center space-x-1 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Clock className="h-4 w-4" />
                <span>Start: {startTime} {timezone}</span>
              </div>
            </div>
            
            {/* Playback Status */}
            <div className="flex items-center space-x-3 print:hidden">
              {isPlaying && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Play className="h-4 w-4 text-green-500 fill-green-500" />
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Live
                    </span>
                  </div>
                  {timeRemaining && (
                    <span className={`text-sm font-mono px-2 py-1 rounded ${
                      isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {timeRemaining}
                    </span>
                  )}
                </div>
              )}
              
              {!isPlaying && (
                <div className="flex items-center space-x-1">
                  <Pause className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Paused
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
