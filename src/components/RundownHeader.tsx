
import React from 'react';
import HeaderLogo from './header/HeaderLogo';
import HeaderTitle from './header/HeaderTitle';
import HeaderControls from './header/HeaderControls';
import HeaderBottomSection from './header/HeaderBottomSection';
import RealtimeStatusIndicator from './RealtimeStatusIndicator';
import { RundownItem } from '@/types/rundown';

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
  items?: RundownItem[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
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
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  isPlaying = false,
  currentSegmentId = null,
  timeRemaining = 0,
  autoScrollEnabled = false,
  onToggleAutoScroll
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
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 border-b border-gray-200 dark:border-gray-700">
      {/* Mobile layout: Compact single column - only for screens smaller than 640px */}
      <div className="block sm:hidden">
        <div className="mb-1">
          <HeaderTitle
            title={title}
            onTitleChange={onTitleChange}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
          />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mt-1 flex items-center gap-2">
            {(isConnected !== undefined || isProcessingRealtimeUpdate !== undefined) && (
              <RealtimeStatusIndicator
                isConnected={isConnected || false}
                isProcessingUpdate={isProcessingRealtimeUpdate || false}
              />
            )}
          </div>
        </div>
        <HeaderControls
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
        />
      </div>

      {/* Tablet layout: Optimized for tablet screens 640px - 1024px */}
      <div className="hidden sm:block lg:hidden">
        {/* Top row: Logo and Title */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <HeaderLogo />
            <div className="flex-1 min-w-0">
              <HeaderTitle
                title={title}
                onTitleChange={onTitleChange}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {(isConnected !== undefined || isProcessingRealtimeUpdate !== undefined) && (
              <RealtimeStatusIndicator
                isConnected={isConnected || false}
                isProcessingUpdate={isProcessingRealtimeUpdate || false}
              />
            )}
          </div>
        </div>
        
        {/* Bottom row: Controls */}
        <div className="flex justify-end">
          <HeaderControls
            currentTime={currentTime}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
            onUndo={onUndo}
            canUndo={canUndo}
            lastAction={lastAction}
          />
        </div>

        {/* Bottom section for tablet */}
        <HeaderBottomSection
          totalRuntime={totalRuntime}
          rundownStartTime={rundownStartTime}
          onRundownStartTimeChange={onRundownStartTimeChange}
          items={items}
          isPlaying={isPlaying}
          currentSegmentId={currentSegmentId}
          timeRemaining={timeRemaining}
        />
      </div>

      {/* Desktop layout: Logo, title, and controls in a row - for screens 1024px and larger */}
      <div className="hidden lg:block">
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
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              {(isConnected !== undefined || isProcessingRealtimeUpdate !== undefined) && (
                <RealtimeStatusIndicator
                  isConnected={isConnected || false}
                  isProcessingUpdate={isProcessingRealtimeUpdate || false}
                />
              )}
            </div>
            <HeaderControls
              currentTime={currentTime}
              timezone={timezone}
              onTimezoneChange={onTimezoneChange}
              onUndo={onUndo}
              canUndo={canUndo}
              lastAction={lastAction}
            />
          </div>
        </div>

        <HeaderBottomSection
          totalRuntime={totalRuntime}
          rundownStartTime={rundownStartTime}
          onRundownStartTimeChange={onRundownStartTimeChange}
          items={items}
          isPlaying={isPlaying}
          currentSegmentId={currentSegmentId}
          timeRemaining={timeRemaining}
        />
      </div>
    </div>
  );
};

export default RundownHeader;
