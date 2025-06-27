import React, { useState } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import { Clock, Wifi, WifiOff, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TimezoneSelector from './TimezoneSelector';
import HeaderLogo from './header/HeaderLogo';
import ShowcallerTimingIndicator from './showcaller/ShowcallerTimingIndicator';
import { FindReplaceDialog } from './FindReplaceDialog';
import { useFindReplace } from '@/hooks/useFindReplace';
import { useShowcallerTiming } from '@/hooks/useShowcallerTiming';
import { format } from 'date-fns';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
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
  onUpdateItem?: (id: string, field: string, value: string) => void;
  onJumpToItem?: (itemId: string) => void;
  searchState?: {
    searchTerm: string;
    caseSensitive: boolean;
    currentMatchIndex: number;
    matchCount: number;
  };
  onSearchStateChange?: (state: any) => void;
}

const RundownHeader = ({
  currentTime,
  timezone,
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
  onUpdateItem,
  onJumpToItem,
  searchState,
  onSearchStateChange
}: RundownHeaderProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Find and Replace functionality
  const findReplace = useFindReplace({
    items,
    onUpdateItem: onUpdateItem || (() => {}),
    onJumpToItem
  });

  // Use external search state if provided, otherwise use internal state
  const searchTerm = searchState?.searchTerm ?? findReplace.searchTerm;
  const caseSensitive = searchState?.caseSensitive ?? findReplace.caseSensitive;
  const currentMatchIndex = searchState?.currentMatchIndex ?? findReplace.currentMatchIndex;
  const matchCount = searchState?.matchCount ?? findReplace.matchCount;

  // Handlers that update both internal and external state
  const handleSearchTermChange = (term: string) => {
    findReplace.setSearchTerm(term);
    if (onSearchStateChange) {
      onSearchStateChange({ ...searchState, searchTerm: term });
    }
  };

  const handleCaseSensitiveChange = (enabled: boolean) => {
    findReplace.setCaseSensitive(enabled);
    if (onSearchStateChange) {
      onSearchStateChange({ ...searchState, caseSensitive: enabled });
    }
  };

  const handleNextMatch = () => {
    findReplace.nextMatch();
  };

  const handlePreviousMatch = () => {
    findReplace.previousMatch();
  };

  // Get showcaller timing status
  const timingStatus = useShowcallerTiming({
    items,
    rundownStartTime,
    isPlaying,
    currentSegmentId,
    timeRemaining
  });

  // Keyboard shortcut for find and replace
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
    
    // Format as HH:MM:SS
    if (value.length >= 2) {
      value = value.substring(0, 2) + ':' + value.substring(2);
    }
    if (value.length >= 6) {
      value = value.substring(0, 5) + ':' + value.substring(5, 7);
    }
    
    // Limit to 8 characters (HH:MM:SS)
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    onRundownStartTimeChange(value);
  };

  const handleTimeInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validate and format the time
    const timeRegex = /^(\d{1,2}):?(\d{0,2}):?(\d{0,2})$/;
    const match = value.match(timeRegex);
    
    if (match) {
      let [, hours, minutes, seconds] = match;
      
      // Pad with zeros and validate ranges
      hours = hours.padStart(2, '0');
      minutes = (minutes || '00').padStart(2, '0');
      seconds = (seconds || '00').padStart(2, '0');
      
      // Validate ranges
      const h = parseInt(hours);
      const m = parseInt(minutes);
      const s = parseInt(seconds);
      
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        const formattedTime = `${hours}:${minutes}:${seconds}`;
        onRundownStartTimeChange(formattedTime);
      }
    }
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
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

  // Helper function to render connection status icon
  const renderConnectionIcon = () => {
    if (isProcessingRealtimeUpdate) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    } else if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  // Create the search trigger button
  const searchTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title="Find & Replace (Ctrl+F)"
    >
      <Search className="h-4 w-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
            <span>{format(currentTime, 'HH:mm:ss')}</span>
            <FindReplaceDialog
              searchTerm={searchTerm}
              replaceTerm={findReplace.replaceTerm}
              caseSensitive={caseSensitive}
              currentMatchIndex={currentMatchIndex}
              matchCount={matchCount}
              onSearchTermChange={handleSearchTermChange}
              onReplaceTermChange={findReplace.setReplaceTerm}
              onCaseSensitiveChange={handleCaseSensitiveChange}
              onNextMatch={handleNextMatch}
              onPreviousMatch={handlePreviousMatch}
              onReplaceCurrent={findReplace.replaceCurrent}
              onReplaceAll={findReplace.replaceAll}
              onReset={findReplace.reset}
              trigger={searchTrigger}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <ShowcallerTimingIndicator
              {...timingStatus}
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
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Top row - Logo, Title, and connection status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <HeaderLogo />
            <div className="flex-1 min-w-0 flex items-center">
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
            </div>
            
            {hasUnsavedChanges && (
              <div className="flex-shrink-0 flex items-center">
                <span className="text-sm text-orange-500 dark:text-orange-400">
                  {isSaving ? 'Saving...' : 'Unsaved changes'}
                </span>
              </div>
            )}
            
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{format(currentTime, 'HH:mm:ss')}</span>
            </div>
            <TimezoneSelector
              currentTimezone={timezone}
              onTimezoneChange={() => {}}
            />
            <FindReplaceDialog
              searchTerm={searchTerm}
              replaceTerm={findReplace.replaceTerm}
              caseSensitive={caseSensitive}
              currentMatchIndex={currentMatchIndex}
              matchCount={matchCount}
              onSearchTermChange={handleSearchTermChange}
              onReplaceTermChange={findReplace.setReplaceTerm}
              onCaseSensitiveChange={handleCaseSensitiveChange}
              onNextMatch={handleNextMatch}
              onPreviousMatch={handlePreviousMatch}
              onReplaceCurrent={findReplace.replaceCurrent}
              onReplaceAll={findReplace.replaceAll}
              onReset={findReplace.reset}
              trigger={searchTrigger}
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
                placeholder="HH:MM:SS"
                className="w-20 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
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
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <HeaderLogo />
          <div className="flex-1 min-w-0 flex items-center">
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
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex-shrink-0 flex items-center">
              <span className="text-sm text-orange-500 dark:text-orange-400">
                {isSaving ? 'Saving...' : 'Unsaved changes'}
              </span>
            </div>
          )}
          
          <ShowcallerTimingIndicator
            {...timingStatus}
          />
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <span className="text-lg font-mono">{format(currentTime, 'HH:mm:ss')}</span>
          <TimezoneSelector
            currentTimezone={timezone}
            onTimezoneChange={() => {}}
          />
          
          <FindReplaceDialog
            searchTerm={searchTerm}
            replaceTerm={findReplace.replaceTerm}
            caseSensitive={caseSensitive}
            currentMatchIndex={currentMatchIndex}
            matchCount={matchCount}
            onSearchTermChange={handleSearchTermChange}
            onReplaceTermChange={findReplace.setReplaceTerm}
            onCaseSensitiveChange={handleCaseSensitiveChange}
            onNextMatch={handleNextMatch}
            onPreviousMatch={handlePreviousMatch}
            onReplaceCurrent={findReplace.replaceCurrent}
            onReplaceAll={findReplace.replaceAll}
            onReset={findReplace.reset}
            trigger={searchTrigger}
          />
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Start Time:</span>
            <input
              type="text"
              value={rundownStartTime}
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur}
              placeholder="HH:MM:SS"
              className="w-24 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
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
