
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
  rundownTitle?: string;
  rundownData?: CSVExportData;
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
  rundownTitle,
  rundownData
}: MobileToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-3 border-b bg-gray-50 dark:bg-gray-700">
      <div className="flex items-center justify-between">
        {/* Dropdown Menu for Actions */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              Actions
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-64 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
          >
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
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Playback Controls and Theme Toggle */}
        <div className="flex items-center gap-2">
          <PlaybackControls
            selectedRowId={selectedRowId}
            isPlaying={isPlaying}
            currentSegmentId={currentSegmentId}
            timeRemaining={timeRemaining}
            onPlay={onPlay}
            onPause={onPause}
            onForward={onForward}
            onBackward={onBackward}
            size="sm"
          />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default MobileToolbar;
