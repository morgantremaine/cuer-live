
import React from 'react';
import RundownHeader from './RundownHeader';
import RundownToolbar from './RundownToolbar';
import { FindReplaceDialog } from '@/components/FindReplaceDialog';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CSVExportData } from '@/utils/csvExport';

interface RundownHeaderSectionProps {
  currentTime: Date;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  totalRuntime: string;
  onAddRow: (selectedRowId?: string | null) => void;
  onAddHeader: (selectedRowId?: string | null) => void;
  onShowColumnManager: () => void;
  selectedCount: number;
  hasClipboardData: boolean;
  onCopySelectedRows: () => void;
  onPasteRows: () => void;
  onDeleteSelectedRows: () => void;
  onClearSelection: () => void;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  rundownTitle: string;
  onTitleChange: (title: string) => void;
  rundownStartTime: string;
  onRundownStartTimeChange: (startTime: string) => void;
  rundownId?: string;
  onOpenTeleprompter: () => void;
  items?: any[];
  visibleColumns?: any[];
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  isConnected?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  // Find/Replace props
  searchTerm?: string;
  caseSensitive?: boolean;
  currentMatchIndex?: number;
  matchCount?: number;
  matches?: any[];
  findReplaceActions?: {
    setSearchTerm: (term: string) => void;
    setReplaceTerm: (term: string) => void;
    setCaseSensitive: (caseSensitive: boolean) => void;
    nextMatch: () => void;
    previousMatch: () => void;
    replaceCurrent: () => void;
    replaceAll: () => void;
    reset: () => void;
    replaceTerm: string;
  };
}

const RundownHeaderSection = ({
  currentTime,
  timezone,
  onTimezoneChange,
  totalRuntime,
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  selectedCount,
  hasClipboardData,
  onCopySelectedRows,
  onPasteRows,
  onDeleteSelectedRows,
  onClearSelection,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  hasUnsavedChanges,
  isSaving,
  rundownTitle,
  onTitleChange,
  rundownStartTime,
  onRundownStartTimeChange,
  rundownId,
  onOpenTeleprompter,
  items = [],
  visibleColumns = [],
  onUndo,
  canUndo,
  lastAction,
  isConnected,
  isProcessingRealtimeUpdate,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  searchTerm = '',
  caseSensitive = false,
  currentMatchIndex = 0,
  matchCount = 0,
  matches = [],
  findReplaceActions
}: RundownHeaderSectionProps) => {
  return (
    <div>
      <RundownHeader
        currentTime={currentTime}
        timezone={timezone}
        totalRuntime={totalRuntime}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        title={rundownTitle}
        onTitleChange={onTitleChange}
        rundownStartTime={rundownStartTime}
        onRundownStartTimeChange={onRundownStartTimeChange}
        items={items}
        visibleColumns={visibleColumns}
        onUndo={onUndo}
        canUndo={canUndo}
        lastAction={lastAction}
        isConnected={isConnected}
        isProcessingRealtimeUpdate={isProcessingRealtimeUpdate}
        isPlaying={isPlaying}
        currentSegmentId={currentSegmentId}
        timeRemaining={timeRemaining}
      />
      <div className="flex items-center justify-between p-2 border-b border-border bg-background">
        <RundownToolbar
          onAddRow={() => onAddRow(selectedRowId)}
          onAddHeader={() => onAddHeader(selectedRowId)}
          onShowColumnManager={onShowColumnManager}
          selectedRowId={selectedRowId}
          isPlaying={isPlaying}
          currentSegmentId={currentSegmentId}
          timeRemaining={timeRemaining}
          onPlay={onPlay}
          onPause={onPause}
          onForward={onForward}
          onBackward={onBackward}
          onReset={onReset}
          rundownId={rundownId}
          onOpenTeleprompter={onOpenTeleprompter}
          onUndo={onUndo}
          canUndo={canUndo}
          lastAction={lastAction}
          rundownTitle={rundownTitle}
          rundownData={rundownData}
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={onToggleAutoScroll}
        />
        
        {/* Find & Replace Button */}
        {findReplaceActions && (
          <FindReplaceDialog
            searchTerm={searchTerm}
            replaceTerm={findReplaceActions.replaceTerm}
            caseSensitive={caseSensitive}
            currentMatchIndex={currentMatchIndex}
            matchCount={matchCount}
            onSearchTermChange={findReplaceActions.setSearchTerm}
            onReplaceTermChange={findReplaceActions.setReplaceTerm}
            onCaseSensitiveChange={findReplaceActions.setCaseSensitive}
            onNextMatch={findReplaceActions.nextMatch}
            onPreviousMatch={findReplaceActions.previousMatch}
            onReplaceCurrent={findReplaceActions.replaceCurrent}
            onReplaceAll={findReplaceActions.replaceAll}
            onReset={findReplaceActions.reset}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Find & Replace"
              >
                <Search className="h-4 w-4" />
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};

export default RundownHeaderSection;
