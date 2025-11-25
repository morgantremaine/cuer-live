import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import PlaybackControls from './PlaybackControls';
import AutoScrollToggle from './AutoScrollToggle';
import ZoomControls from './ZoomControls';
import { CSVExportData } from '@/utils/csvExport';

interface TabletToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  rundownId: string | undefined;
  teamId?: string;
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  rundownTitle?: string;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  onJumpToCurrentSegment?: () => void;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
  onShowHistory?: () => void;
  // Zoom controls
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isDefaultZoom?: boolean;
  // Row number locking
  numberingLocked?: boolean;
  onToggleLock?: () => void;
  userRole?: 'admin' | 'manager' | 'member' | 'showcaller' | 'teleprompter' | null;
  // Print dialog control
  showPrintDialog?: boolean;
  onShowPrintDialogChange?: (show: boolean) => void;
}

const TabletToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  onRedo,
  canRedo,
  nextRedoAction,
  rundownId,
  teamId,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  rundownTitle,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  onShowFindReplace,
  onShowNotes,
  onShowHistory,
  // Zoom props
  zoomLevel = 1.0,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn = true,
  canZoomOut = true,
  isDefaultZoom = true,
  // Lock props
  numberingLocked = false,
  onToggleLock,
  userRole,
  // Print props
  showPrintDialog,
  onShowPrintDialogChange
}: TabletToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const canUseShowcaller = userRole !== 'member';

  return (
    <div className="p-2 border-b bg-gray-50 dark:bg-gray-700">
      {/* Single row - Actions dropdown, playback controls, and theme toggle */}
      <div className="flex items-center justify-between gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 px-3">
              <span className="text-sm">Actions</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-80 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg z-50"
            sideOffset={4}
          >
            <div className="space-y-2">
              <MainActionButtons
                onAddRow={onAddRow}
                onAddHeader={onAddHeader}
                onShowColumnManager={onShowColumnManager}
                onUndo={onUndo}
                canUndo={canUndo}
                lastAction={lastAction}
                onRedo={onRedo}
                canRedo={canRedo}
                nextRedoAction={nextRedoAction}
                  rundownId={rundownId}
                  teamId={teamId}
                  selectedRowId={selectedRowId}
                isMobile={true}
                rundownTitle={rundownTitle}
                rundownData={rundownData}
                onShowFindReplace={onShowFindReplace}
                onShowNotes={onShowNotes}
                onShowHistory={onShowHistory}
                numberingLocked={numberingLocked}
                onToggleLock={onToggleLock}
                showPrintDialog={showPrintDialog}
                onShowPrintDialogChange={onShowPrintDialogChange}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Playback Controls - Everyone except members */}
        {canUseShowcaller && (
          <div className="flex justify-center flex-1">
            <PlaybackControls
              selectedRowId={selectedRowId}
              isPlaying={isPlaying}
              currentSegmentId={currentSegmentId}
              timeRemaining={timeRemaining}
              onPlay={onPlay}
              onPause={onPause}
              onForward={onForward}
              onBackward={onBackward}
              onReset={onReset}
              size="sm"
            />
          </div>
        )}

        {/* Autoscroll - Available to ALL roles */}
        {onToggleAutoScroll && (
          <AutoScrollToggle
            autoScrollEnabled={autoScrollEnabled}
            onToggleAutoScroll={onToggleAutoScroll}
            onJumpToCurrentSegment={onJumpToCurrentSegment}
            size="sm"
          />
        )}

        {/* Zoom Controls */}
        {onZoomIn && onZoomOut && onResetZoom && (
          <ZoomControls
            zoomLevel={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onResetZoom={onResetZoom}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            isDefaultZoom={isDefaultZoom}
            size="sm"
          />
        )}

        <ThemeToggle />
      </div>
    </div>
  );
};

export default TabletToolbar;
