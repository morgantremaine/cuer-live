
import React from 'react';
import HeaderLogo from './header/HeaderLogo';
import HeaderTitle from './header/HeaderTitle';
import HeaderBottomSection from './header/HeaderBottomSection';
import HeaderControls from './header/HeaderControls';
import ConnectionStatusBadge from './ConnectionStatusBadge';

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
  onRundownStartTimeChange: (time: string) => void;
  items: any[];
  visibleColumns: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected: boolean;
  isProcessingRealtimeUpdate: boolean;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: string;
  autoScrollEnabled: boolean;
  onToggleAutoScroll: () => void;
  onSearchOpen?: () => void;
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
  items,
  visibleColumns,
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
  onSearchOpen
}: RundownHeaderProps) => {
  // Calculate duration based on totalRuntime
  const duration = totalRuntime || '0:00';
  
  // Parse current segment name
  const currentSegmentName = currentSegmentId 
    ? items?.find(item => item.id === currentSegmentId)?.name || ''
    : '';

  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex flex-col space-y-4 p-4 bg-gray-50 dark:bg-gray-900">
        {/* Top section with logo and controls */}
        <div className="flex items-center justify-between">
          <HeaderLogo />
          <HeaderControls
            currentTime={currentTime}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
            onUndo={onUndo}
            canUndo={canUndo}
            lastAction={lastAction}
            onSearchOpen={onSearchOpen}
          />
        </div>

        {/* Title and timing section */}
        <HeaderTitle
          title={title}
          onTitleChange={onTitleChange}
          startTime={rundownStartTime}
          onStartTimeChange={onRundownStartTimeChange}
          duration={duration}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
        />

        {/* Bottom section with playback status */}
        <HeaderBottomSection
          isPlaying={isPlaying}
          currentSegmentName={currentSegmentName}
          timeRemaining={timeRemaining}
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={onToggleAutoScroll}
        />

        {/* Connection status indicator */}
        <ConnectionStatusBadge 
          isConnected={isConnected}
          isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        />
      </div>
    </div>
  );
};

export default RundownHeader;
