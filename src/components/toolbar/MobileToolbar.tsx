
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
import { CSVExportData } from '@/utils/csvExport';

interface MobileToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
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
}

const MobileToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  rundownId,
  onOpenTeleprompter,
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
  onShowNotes
}: MobileToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-2 border-b bg-gray-50 dark:bg-gray-700">
      {/* Single row - Actions dropdown and theme toggle */}
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
                rundownId={rundownId}
                onOpenTeleprompter={onOpenTeleprompter}
                selectedRowId={selectedRowId}
                isMobile={true}
                rundownTitle={rundownTitle}
                rundownData={rundownData}
                autoScrollEnabled={autoScrollEnabled}
                onToggleAutoScroll={onToggleAutoScroll}
                onJumpToCurrentSegment={onJumpToCurrentSegment}
                // Pass playback controls for mobile
                isPlaying={isPlaying}
                currentSegmentId={currentSegmentId}
                timeRemaining={timeRemaining}
                onPlay={onPlay}
                onPause={onPause}
                onForward={onForward}
                onBackward={onBackward}
                onReset={onReset}
                onShowFindReplace={onShowFindReplace}
                onShowNotes={onShowNotes}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
      </div>
    </div>
  );
};

export default MobileToolbar;
