import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import { Clock, Wifi, WifiOff, LoaderCircle, Eye, EyeOff, Search, Calendar } from 'lucide-react';
import { debugLogger } from '@/utils/debugLogger';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz/formatInTimeZone';
import { cn } from '@/lib/utils';
import TimezoneSelector from './TimezoneSelector';
import HeaderLogo from './header/HeaderLogo';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { useUniversalTiming } from '@/hooks/useUniversalTiming';
import { useBroadcastHealthMonitor } from '@/hooks/useBroadcastHealthMonitor';
import { useRealtimeConnection } from './RealtimeConnectionProvider';
import RundownSaveIndicator from './header/RundownSaveIndicator';
import { useClockFormat } from '@/contexts/ClockFormatContext';
import { parseTimeInput, isValidTimeInput } from '@/utils/timeInputParser';

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
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  rundownId?: string | null;
  onUpdateItem?: (id: string, field: string, value: string) => void;
  hasActiveTeammates?: boolean;
  activeTeammateNames?: string[];
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
  onRedo,
  canRedo,
  nextRedoAction,
  isConnected,
  isProcessingRealtimeUpdate,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  autoScrollEnabled,
  onToggleAutoScroll,
  items = [],
  rundownId,
  onUpdateItem,
  hasActiveTeammates,
  activeTeammateNames = []
}: RundownHeaderProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const { clockFormat, formatTime: formatClockTime } = useClockFormat();
  
  // Format the displayed start time value based on clock format
  const displayedStartTime = clockFormat === '12' ? formatClockTime(rundownStartTime) : rundownStartTime;

  // Listen to browser network events for immediate WiFi icon updates
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 RundownHeader: Browser online');
      setIsBrowserOnline(true);
    };
    
    const handleOffline = () => {
      console.log('🌐 RundownHeader: Browser offline');
      setIsBrowserOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Debug logging for presence tracking and computed display flag
  const showTeammateEditing = !!(hasActiveTeammates && !isProcessingRealtimeUpdate);
  debugLogger.realtime('RUNDOWN HEADER DEBUG:', {
    hasActiveTeammates,
    isProcessingRealtimeUpdate,
    showTeammateEditing
  });
  const { getUniversalTime } = useUniversalTiming();
  
  const timeInputRef = useRef<HTMLInputElement>(null);
  const lastSavedContentSignatureRef = useRef<string>('');
  const [hasContentOnlyChanges, setHasContentOnlyChanges] = useState(false);
  
  // Check if this is a demo rundown
  const isDemoRundown = rundownId === DEMO_RUNDOWN_ID;

  // Monitor broadcast health for connection quality
  const broadcastHealth = useBroadcastHealthMonitor(rundownId || '', !!rundownId);
  const isDegraded = isConnected && !broadcastHealth.isHealthy;

  // Get showcaller timing status
  const timingStatus = useShowcallerTiming({
    items,
    rundownStartTime,
    timezone,
    isPlaying,
    currentSegmentId,
    timeRemaining
  });

  // Create a content-only signature to detect non-column changes
  const contentOnlySignature = useMemo(() => {
    // Use the same structure as the content signature utility
    return JSON.stringify({
      items: (items || []).map(item => ({
        id: item.id,
        type: item.type,
        name: item.name || '',
        talent: item.talent || '',
        script: item.script || '',
        gfx: item.gfx || '',
        video: item.video || '',
        images: item.images || '',
        notes: item.notes || '',
        duration: item.duration || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        color: item.color || '',
        isFloating: Boolean(item.isFloating),
        isFloated: Boolean(item.isFloated),
        customFields: item.customFields || {},
        segmentName: item.segmentName || '',
        rowNumber: item.rowNumber || 0
      })),
      title: title || '',
      showDate: null,
      externalNotes: ''
    });
  }, [items, title]);

  // Track content-only changes separately from the main change tracking
  React.useEffect(() => {
    // Initialize baseline on first load
    if (!lastSavedContentSignatureRef.current) {
      lastSavedContentSignatureRef.current = contentOnlySignature;
      setHasContentOnlyChanges(false);
      return;
    }

    // Check if content has actually changed (ignoring columns)
    const contentChanged = contentOnlySignature !== lastSavedContentSignatureRef.current;
    setHasContentOnlyChanges(contentChanged);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 RUNDOWN HEADER: Content-only change detection', {
        contentChanged,
        currentSigLength: contentOnlySignature.length,
        lastSavedSigLength: lastSavedContentSignatureRef.current.length,
        itemCount: (items || []).length,
        title: title || '',
        excludedFromDetection: ['columns', 'timezone', 'startTime', 'visibleColumns']
      });
    }
  }, [contentOnlySignature]);

  // Update baseline when main system completes a save
  React.useEffect(() => {
    if (!isSaving && !hasUnsavedChanges) {
      // Save completed - update our content baseline
      lastSavedContentSignatureRef.current = contentOnlySignature;
      setHasContentOnlyChanges(false);
    }
  }, [isSaving, hasUnsavedChanges, contentOnlySignature]);

  // Track saving transitions to trigger a saved flash using the coordinated save state
  const [shouldShowSavedFlash, setShouldShowSavedFlash] = useState(false);
  const prevIsSavingRef = useRef(false);
  React.useEffect(() => {
    const prev = prevIsSavingRef.current;
    // Trigger flash when save completes (was saving, now not saving, and no unsaved changes)
    if (prev && !isSaving && !hasUnsavedChanges) {
      setShouldShowSavedFlash(true);
      // Keep the flag true long enough for the indicator to see it and start its own timer
      const timer = setTimeout(() => setShouldShowSavedFlash(false), 100);
      return () => clearTimeout(timer);
    }
    prevIsSavingRef.current = isSaving;
  }, [isSaving, hasUnsavedChanges]);

  // Create save state using the proper save state from the hook
  // This includes per-cell save state when per-cell save is enabled
  const saveState = {
    isSaving: isSaving, // Use the coordinated save state from the hook
    hasUnsavedChanges: hasUnsavedChanges, // Use the coordinated unsaved changes from the hook
    lastSaved: null,
    saveError: null,
    hasContentChanges: hasUnsavedChanges // Content changes are tracked by the save coordination system
  };

  // Get current universal time for display
  const universalTime = new Date(getUniversalTime());

  // Format time in the selected timezone using universal time
  const formatTimeInTimezone = (time: Date, tz: string) => {
    try {
      // Map Las Vegas to Los Angeles timezone for display
      const actualTimezone = tz === 'America/Las_Vegas' ? 'America/Los_Angeles' : tz;
      const timeFormat = clockFormat === '12' ? 'hh:mm:ss a' : 'HH:mm:ss';
      return formatInTimeZone(time, actualTimezone, timeFormat);
    } catch {
      // Fallback to local time if timezone is invalid
      const timeFormat = clockFormat === '12' ? 'hh:mm:ss a' : 'HH:mm:ss';
      return format(time, timeFormat);
    }
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Use the time input validator which allows 12-hour format characters (A, M, P, space)
    if (!isValidTimeInput(value)) {
      return;
    }
    
    // Update the value directly without aggressive formatting
    onRundownStartTimeChange(value);
  };

  const handleTimeInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Use the smart parser that handles both 12-hour and 24-hour formats
    const formattedTime = parseTimeInput(value);
    
    // Update with the parsed 24-hour format
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

  // Get reconnection status from context
  const { isReconnecting } = useRealtimeConnection();

  // Helper function to render connection status icon with priority-based detection
  const renderConnectionIcon = () => {
    let icon;
    let tooltip;
    
    // PRIORITY 1: Browser offline (immediate detection)
    if (!isBrowserOnline) {
      icon = <WifiOff className="h-4 w-4 text-red-500" />;
      tooltip = "No internet connection";
    }
    // PRIORITY 2: Reconnecting state (from coordinator)
    else if (isReconnecting) {
      icon = <LoaderCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
      tooltip = "Reconnecting...";
    }
    // PRIORITY 3: Supabase channel disconnected
    else if (!isConnected) {
      icon = <LoaderCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
      tooltip = "Connecting to server...";
    }
    // PRIORITY 4: Degraded connection (poor broadcast health)
    else if (isDegraded) {
      icon = <Wifi className="h-4 w-4 text-yellow-500" />;
      tooltip = "Connection issues - may be slower";
    }
    // PRIORITY 5: All good
    else {
      icon = <Wifi className="h-4 w-4 text-green-500" />;
      tooltip = "Connection healthy";
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {icon}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isMobile) {
    return (
      <div className="p-3 bg-gray-200 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Mobile logo and title */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <img 
              src="/uploads/logos/cuer-mobile-logo.png" 
              alt="Cuer" 
              className="h-6 w-6 flex-shrink-0"
            />
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
        </div>
        
        {/* Bottom row - Compact info with save indicator */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTimeInTimezone(universalTime, timezone)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <RundownSaveIndicator 
              saveState={saveState} 
              shouldShowSavedFlash={shouldShowSavedFlash} 
              isTeammateEditing={showTeammateEditing} 
              activeTeammateNames={activeTeammateNames}
              isMobile={true}
            />
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
              <RundownSaveIndicator saveState={saveState} shouldShowSavedFlash={shouldShowSavedFlash} isTeammateEditing={showTeammateEditing} activeTeammateNames={activeTeammateNames} />
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
              <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                <input
                  ref={timeInputRef}
                  type="text"
                  value={displayedStartTime}
                  onChange={handleTimeInputChange}
                  onBlur={handleTimeInputBlur}
                  placeholder={clockFormat === '12' ? "HH:MM:SS AM/PM" : "HH:MM:SS"}
                  className={`${clockFormat === '12' ? 'w-28 text-center' : 'w-20'} text-sm bg-transparent px-2 py-1 text-gray-900 dark:text-white focus:outline-none font-mono border-0`}
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
          <RundownSaveIndicator saveState={saveState} shouldShowSavedFlash={shouldShowSavedFlash} isTeammateEditing={showTeammateEditing} activeTeammateNames={activeTeammateNames} />
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
            <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <input
                ref={timeInputRef}
                type="text"
                value={displayedStartTime}
                onChange={handleTimeInputChange}
                onBlur={handleTimeInputBlur}
                placeholder={clockFormat === '12' ? "HH:MM:SS AM/PM" : "HH:MM:SS"}
                className={`${clockFormat === '12' ? 'w-32 text-center' : 'w-24'} bg-transparent px-3 py-2 text-gray-900 dark:text-white focus:outline-none font-mono text-sm border-0`}
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
