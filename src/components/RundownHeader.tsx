import React from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TimezoneSelector from './TimezoneSelector';
import HeaderLogo from './header/HeaderLogo';
import { format } from 'date-fns';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: any[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
}

const RundownHeader = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  hasUnsavedChanges,
  isSaving,
  title,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  autoScrollEnabled,
  onToggleAutoScroll
}: RundownHeaderProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
    
    // Format as HH:MM
    if (value.length >= 2) {
      value = value.substring(0, 2) + ':' + value.substring(2);
    }
    
    // Limit to 5 characters (HH:MM)
    if (value.length > 5) {
      value = value.substring(0, 5);
    }
    
    onRundownStartTimeChange(value);
  };

  const handleTimeInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validate and format the time
    const timeRegex = /^(\d{1,2}):?(\d{0,2})$/;
    const match = value.match(timeRegex);
    
    if (match) {
      let [, hours, minutes] = match;
      
      // Pad with zeros and validate ranges
      hours = hours.padStart(2, '0');
      minutes = (minutes || '00').padStart(2, '0');
      
      // Validate ranges
      const h = parseInt(hours);
      const m = parseInt(minutes);
      
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const formattedTime = `${hours}:${minutes}`;
        onRundownStartTimeChange(formattedTime);
      }
    }
  };

  if (isMobile) {
    return (
      <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Title */}
        <div className="mb-3">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 focus:border-none"
            placeholder="Untitled Rundown"
          />
        </div>
        
        {/* Bottom row - Compact info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Runtime: {totalRuntime}</span>
            {isConnected !== undefined && (
              <div className="flex items-center">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Logo, Title, and connection status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <HeaderLogo />
            <div className="flex-1 min-w-0 flex items-center">
              <textarea
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full resize-none overflow-hidden text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 leading-tight"
                placeholder="Untitled Rundown"
                rows={1}
                style={{ 
                  minHeight: 'auto',
                  lineHeight: '1.25'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
            
            {hasUnsavedChanges && (
              <div className="flex-shrink-0">
                <span className="text-sm text-orange-500 dark:text-orange-400">
                  {isSaving ? 'Saving...' : 'Unsaved changes'}
                </span>
              </div>
            )}
          </div>
          
          {isConnected !== undefined && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {/* Bottom row - Time info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono">{format(currentTime, 'HH:mm:ss')}</span>
            </div>
            <TimezoneSelector
              currentTimezone={timezone}
              onTimezoneChange={onTimezoneChange}
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Start:</span>
              <input
                type="text"
                value={rundownStartTime}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                placeholder="HH:MM"
                className="w-16 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <span>Runtime: {totalRuntime}</span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - with properly centered title
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <HeaderLogo />
          <div className="flex-1 min-w-0 flex items-center">
            <textarea
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full resize-none overflow-hidden text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 leading-tight"
              placeholder="Untitled Rundown"
              rows={1}
              style={{ 
                minHeight: 'auto',
                lineHeight: '1.25'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex-shrink-0">
              <span className="text-sm text-orange-500 dark:text-orange-400">
                {isSaving ? 'Saving...' : 'Unsaved changes'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <span className="text-lg font-mono">{format(currentTime, 'HH:mm:ss')}</span>
          <TimezoneSelector
            currentTimezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Start Time:</span>
            <input
              type="text"
              value={rundownStartTime}
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur}
              placeholder="HH:MM"
              className="w-20 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
          </div>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Runtime: {totalRuntime}
          </span>
          
          {isConnected !== undefined && (
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
