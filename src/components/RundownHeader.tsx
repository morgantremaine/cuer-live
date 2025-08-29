import React, { useState, useRef } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import { Clock, Wifi, WifiOff, LoaderCircle, Eye, EyeOff, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import TimezoneSelector from './TimezoneSelector';
import HeaderLogo from './header/HeaderLogo';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { useUniversalTiming } from '@/hooks/useUniversalTiming';
import { extractTimeFromISO } from '@/utils/timeUtils';
import AnimatedWifiIcon from './AnimatedWifiIcon';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { supabase } from '@/integrations/supabase/client';


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
  const { getUniversalTime } = useUniversalTiming();
  
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

  // Save full start date-time (ISO) to DB without affecting internal time-only state
  const handleStartDateChangeISO = async (isoDateTime: string) => {
    try {
      if (!rundownId) return;
      await supabase
        .from('rundowns')
        .update({ start_time: isoDateTime, updated_at: new Date().toISOString() })
        .eq('id', rundownId);
    } catch (error) {
      console.error('Failed to save start date-time', error);
    }
  };

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
            <span>Runtime: {totalRuntime}</span>
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
              <DateTimePicker
                value={rundownStartTime}
                onValueChange={(isoDateTime) => onRundownStartTimeChange(extractTimeFromISO(isoDateTime))}
                className="text-sm bg-transparent font-mono"
              />
            </div>
            <span>Runtime: {totalRuntime}</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Start Time:</span>
            <DateTimePicker
              value={rundownStartTime}
              onValueChange={(isoDateTime) => onRundownStartTimeChange(extractTimeFromISO(isoDateTime))}
              className="bg-transparent text-sm font-mono"
            />
          </div>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Runtime: {totalRuntime}
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
