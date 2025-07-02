
import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onOpenFindReplace?: () => void;
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
  onOpenFindReplace
}: MobileToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center p-4 bg-card border-b border-border">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <MoreHorizontal className="h-4 w-4" />
            <span>Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-80 p-4">
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
            onOpenFindReplace={onOpenFindReplace}
            isPlaying={isPlaying}
            currentSegmentId={currentSegmentId}
            timeRemaining={timeRemaining}
            onPlay={onPlay}
            onPause={onPause}
            onForward={onForward}
            onBackward={onBackward}
            onReset={onReset}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MobileToolbar;
