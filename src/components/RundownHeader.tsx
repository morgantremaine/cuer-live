import React, { useState, useRef } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import { Clock, Wifi, WifiOff, LoaderCircle, Eye, EyeOff, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz/formatInTimeZone';
import { cn } from '@/lib/utils';
import TimezoneSelector from './TimezoneSelector';
import HeaderLogo from './header/HeaderLogo';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { useUniversalTiming } from '@/hooks/useUniversalTiming';
import AnimatedWifiIcon from './AnimatedWifiIcon';

import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';


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
  showDate?: Date | null;
  onShowDateChange?: (date: Date | null) => void;
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
  rundownId?: string | null;
  onUpdateItem?: (id: string, field: string, value: string) => void;
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
  showDate,
  onShowDateChange,
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  autoScrollEnabled,
  onToggleAutoScroll,
  items = [],
  rundownId,
  onUpdateItem
}: RundownHeaderProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { getUniversalTime } = useUniversalTiming();
  
  const timeInputRef = useRef<HTMLInputElement>(null);
  
  // Check if this is a demo rundown
  const isDemoRundown = rundownId === DEMO_RUNDOWN_ID;

  // Get showcaller timing status
  const timingStatus = useShowcallerTiming({
    items,
    rundownStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining
  });

  // Get current universal time for display
  const universalTime = new Date(getUniversalTime());

  // Format time in the selected timezone using universal time
  const formatTimeInTimezone = (time: Date, tz: string) => {
    try {
      // Map Las Vegas to Los Angeles timezone for display
      const actualTimezone = tz === 'America/Las_Vegas' ? 'America/Los_Angeles' : tz;
      return formatInTimeZone(time, actualTimezone, 'HH:mm:ss');
    } catch {
      // Fallback to local time if timezone is invalid
      return format(time, 'HH:mm:ss');
    }
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow natural typing - only restrict clearly invalid characters
    // Allow digits, colons, and common separators
    if (!/^[0-9:]*$/.test(value)) {
      return;
    }
    
    // Update the value directly without aggressive formatting
    onRundownStartTimeChange(value);
  };

  const handleTimeInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only format and validate on blur
    let formattedTime = value;
    
    // Remove any non-digit, non-colon characters
    formattedTime = formattedTime.replace(/[^0-9:]/g, '');
    
    // Split by colon and pad/validate each part
    const parts = formattedTime.split(':');
    
    if (parts.length >= 1) {
      // Hours
      let hours = parts[0] || '00';
      if (hours.length === 1) hours = '0' + hours;
      if (parseInt(hours) > 23) hours = '23';
      
      // Minutes
      let minutes = parts[1] || '00';
      if (minutes.length === 1) minutes = '0' + minutes;
      if (parseInt(minutes) > 59) minutes = '59';
      
      // Seconds
      let seconds = parts[2] || '00';
      if (seconds.length === 1) seconds = '0' + seconds;
      if (parseInt(seconds) > 59) seconds = '59';
      
      formattedTime = `${hours}:${minutes}:${seconds}`;
    } else {
      // If no valid format, default to current time or 00:00:00
      formattedTime = rundownStartTime || '00:00:00';
    }
    
    onRundownStartTimeChange(formattedTime);
  };

  const handleTitleEdit = () => {
    if (!isDemoRundown) {
      setIsEditingTitle(true);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  // Helper function to render connection status icon with improved state handling
  const renderConnectionIcon = () => {
    // Priority 1: Show saving spinner if actively saving
    if (isSaving) {
      return <LoaderCircle className="h-4 w-4 text-green-500 animate-spin" />;
    }
    
    // Priority 2: Show processing animation if processing realtime update
    if (isProcessingRealtimeUpdate) {
      return <AnimatedWifiIcon className="text-blue-500" isAnimating={true} />;
    }
    
    // Priority 3: Show connected state if connected
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    
    // Only show disconnect if actually disconnected
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  if (isMobile) {
    return (
      <div className="p-3 bg-gray-200 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Title */}
        <div className="mb-3">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyPress}
                className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 focus:border-none"
                placeholder="Untitled Rundown"
                autoFocus
              />
            ) : (
              <span 
                onClick={handleTitleEdit}
                className="text-lg font-semibold cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 inline-block"
              >
                {title || "Untitled Rundown"}
              </span>
            )}
          </div>
        </div>
        
        {/* Bottom row - Compact info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTimeInTimezone(universalTime, timezone)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <ShowcallerTimingIndicator
              {...timingStatus}
              size="compact"
            />
            <span>TRT: {totalRuntime}</span>
            {isConnected !== undefined && (
              <div className="flex items-center">
                {renderConnectionIcon()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="p-3 bg-gray-200 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Logo, Title, and connection status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <HeaderLogo rundownId={rundownId} />
            <div className="flex-1 min-w-0 flex items-center">
              {isDemoRundown ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title || "Untitled Rundown"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                    <Eye className="h-3 w-3" />
                    Demo
                  </span>
                </div>
              ) : (
                <>
                  {isEditingTitle ? (
                <textarea
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleTitleKeyPress}
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
                  data-field-key="title"
                  name="title" 
                  id="rundown-title-editor"
                  autoFocus
                  />
                ) : (
                  <span 
                    onClick={handleTitleEdit}
                    className="text-lg font-semibold cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 truncate inline-block"
                  >
                    {title || "Untitled Rundown"}
                  </span>
                )}
              </>
              )}
            </div>
            
            {/* {hasUnsavedChanges && (
              <div className="flex-shrink-0 flex items-center">
                <span className={`text-sm ${isSaving ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'}`}>
                  {isSaving ? 'Saved' : 'Drafting'}
                </span>
              </div>
            )} */}
            
            <ShowcallerTimingIndicator
              {...timingStatus}
            />
          </div>
          
          {isConnected !== undefined && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderConnectionIcon()}
            </div>
          )}
        </div>
        
        {/* Bottom row - Time info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TimezoneSelector
              currentTimezone={timezone}
              onTimezoneChange={onTimezoneChange}
              showTime={true}
              timeDisplay={formatTimeInTimezone(universalTime, timezone)}
            />
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Start:</span>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                <input
                  ref={timeInputRef}
                  type="text"
                  value={rundownStartTime}
                  onChange={handleTimeInputChange}
                  onBlur={handleTimeInputBlur}
                  placeholder="HH:MM:SS"
                  className="w-20 text-sm bg-transparent px-2 py-1 text-gray-900 dark:text-white focus:outline-none font-mono border-0"
                />
                {onShowDateChange && (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-16 h-8 justify-center text-center font-normal text-xs border-0 border-l border-gray-300 dark:border-gray-600 rounded-none",
                          !showDate && "text-muted-foreground"
                        )}
                      >
                        {showDate ? format(showDate, "MMM do") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={showDate || undefined}
                        onSelect={(date) => {
                          onShowDateChange(date || null);
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            <span>TRT: {totalRuntime}</span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - with properly centered title and timing indicator
  return (
    <div className="bg-gray-200 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <HeaderLogo rundownId={rundownId} />
          <div className="flex-1 min-w-0 flex items-center">
            {isDemoRundown ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title || "Untitled Rundown"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                  <Eye className="h-3 w-3" />
                  Demo
                </span>
              </div>
            ) : (
              <>
                {isEditingTitle ? (
              <textarea
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyPress}
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
                data-field-key="title"
                name="title" 
                id="rundown-title-editor-desktop"
                autoFocus
              />
            ) : (
              <span 
                onClick={handleTitleEdit}
                className="text-lg font-semibold cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 truncate inline-block"
              >
                {title || "Untitled Rundown"}
              </span>
            )}
          </>
          )}
          </div>
          
          {/* {hasUnsavedChanges && (
            <div className="flex-shrink-0 flex items-center">
              <span className={`text-sm ${isSaving ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'}`}>
                {isSaving ? 'Saved' : 'Drafting'}
              </span>
            </div>
          )} */}
          
          <ShowcallerTimingIndicator
            {...timingStatus}
          />
        </div>
        
          <div className="flex items-center space-x-4 flex-shrink-0">
            <TimezoneSelector
            currentTimezone={timezone}
            onTimezoneChange={onTimezoneChange}
            showTime={true}
            timeDisplay={formatTimeInTimezone(universalTime, timezone)}
            large={true}
          />
          
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Start:</span>
            <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <input
                ref={timeInputRef}
                type="text"
                value={rundownStartTime}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                placeholder="HH:MM:SS"
                className="w-24 bg-transparent px-3 py-2 text-gray-900 dark:text-white focus:outline-none font-mono text-sm border-0"
              />
              {onShowDateChange && (
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-20 h-9 justify-center text-center font-normal text-sm border-0 border-l border-gray-300 dark:border-gray-600 rounded-none",
                        !showDate && "text-muted-foreground"
                      )}
                    >
                      {showDate ? format(showDate, "MMM do") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={showDate || undefined}
                      onSelect={(date) => {
                        onShowDateChange(date || null);
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            TRT: {totalRuntime}
          </span>
          
          {isConnected !== undefined && (
            <div className="flex items-center space-x-2">
              {renderConnectionIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RundownHeader;
