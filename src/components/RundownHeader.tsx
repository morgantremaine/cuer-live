
import React from 'react';
import HeaderControls from './header/HeaderControls';
import HeaderBottomSection from './header/HeaderBottomSection';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownHeaderProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  items?: RundownItem[];
  visibleColumns?: Column[];
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
  onUpdateItem?: (id: string, field: string, value: string) => void;
  onHighlightItem?: (itemId: string) => void;
  onScrollToItem?: (itemId: string) => void;
}

const RundownHeader = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  hasUnsavedChanges = false,
  isSaving = false,
  title,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  isConnected = false,
  isProcessingRealtimeUpdate = false,
  isPlaying = false,
  currentSegmentId,
  timeRemaining = 0,
  autoScrollEnabled = false,
  onToggleAutoScroll,
  onUpdateItem,
  onHighlightItem,
  onScrollToItem
}: RundownHeaderProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm">
      {/* Top Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Rundown
          </h1>
        </div>
        <HeaderControls
          currentTime={currentTime}
          timezone={timezone}
          onTimezoneChange={onTimezoneChange}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
          items={items}
          columns={visibleColumns}
          onUpdateItem={onUpdateItem}
          onHighlightItem={onHighlightItem}
          onScrollToItem={onScrollToItem}
        />
      </div>

      {/* Bottom Section */}
      <HeaderBottomSection
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        title={title}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        totalRuntime={totalRuntime}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
      />
    </div>
  );
};

export default RundownHeader;
