
import React from 'react';
import HeaderLogo from './header/HeaderLogo';
import HeaderTitle from './header/HeaderTitle';
import HeaderControls from './header/HeaderControls';
import HeaderBottomSection from './header/HeaderBottomSection';
import { SearchHighlight } from '@/types/search';

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
  onHighlightMatch?: (itemId: string, field: string, startIndex: number, endIndex: number) => void;
  onReplaceText?: (itemId: string, field: string, searchText: string, replaceText: string, replaceAll: boolean) => void;
  currentHighlight?: SearchHighlight | null;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  hasPendingUpdates?: boolean;
  onManualRefresh?: () => void;
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
  items = [],
  visibleColumns = [],
  onHighlightMatch = () => {},
  onReplaceText = () => {},
  currentHighlight,
  onUndo,
  canUndo,
  lastAction,
  hasPendingUpdates = false,
  onManualRefresh
}: RundownHeaderProps) => {
  const formatTime = (time: Date, tz: string) => {
    try {
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: false,
        timeZone: tz
      });
      return timeString;
    } catch {
      return time.toLocaleTimeString('en-US', { hour12: false });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-3 border-b border-gray-200 dark:border-gray-700">
      {/* Mobile layout: Compact single column */}
      <div className="block sm:hidden">
        <div className="mb-2">
          <HeaderTitle
            title={title}
            onTitleChange={onTitleChange}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
          />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
            <div>{formatTime(currentTime, timezone)} {timezone.replace('_', ' ')}</div>
          </div>
        </div>
        <HeaderControls
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          items={items}
          visibleColumns={visibleColumns}
          onHighlightMatch={onHighlightMatch}
          onReplaceText={onReplaceText}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
          hasPendingUpdates={hasPendingUpdates}
          onManualRefresh={onManualRefresh}
        />
      </div>

      {/* Desktop layout: Logo, title, and controls in a row */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-4">
            <HeaderLogo />
            <HeaderTitle
              title={title}
              onTitleChange={onTitleChange}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
            />
          </div>
          <HeaderControls
            currentTime={currentTime}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
            items={items}
            visibleColumns={visibleColumns}
            onHighlightMatch={onHighlightMatch}
            onReplaceText={onReplaceText}
            onUndo={onUndo}
            canUndo={canUndo}
            lastAction={lastAction}
            hasPendingUpdates={hasPendingUpdates}
            onManualRefresh={onManualRefresh}
          />
        </div>

        <HeaderBottomSection
          totalRuntime={totalRuntime}
          rundownStartTime={rundownStartTime}
          onRundownStartTimeChange={onRundownStartTimeChange}
        />
      </div>
    </div>
  );
};

export default RundownHeader;
