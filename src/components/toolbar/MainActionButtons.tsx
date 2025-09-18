
import React from 'react';
import { Plus, Eye, Undo, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShareRundownMenu } from '@/components/ShareRundownMenu';
import { ToolsMenu } from './ToolsMenu';
import PlaybackControls from './PlaybackControls';
import { CSVExportData } from '@/utils/csvExport';

import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface MainActionButtonsProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  rundownId: string | undefined;
  onOpenTeleprompter: () => void;
  selectedRowId?: string | null;
  isMobile?: boolean;
  rundownTitle?: string;
  rundownData?: CSVExportData;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  onJumpToCurrentSegment?: () => void;
  // Playback controls props for mobile
  isPlaying?: boolean;
  currentSegmentId?: string | null;
  timeRemaining?: number;
  onPlay?: (selectedSegmentId?: string) => void;
  onPause?: () => void;
  onForward?: () => void;
  onBackward?: () => void;
  onReset?: () => void;
  onShowFindReplace?: () => void;
  onShowNotes?: () => void;
}

const MainActionButtons = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  onUndo,
  canUndo,
  lastAction,
  rundownId,
  onOpenTeleprompter,
  selectedRowId,
  isMobile = false,
  rundownTitle = 'Untitled Rundown',
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  onJumpToCurrentSegment,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  onShowFindReplace,
  onShowNotes
}: MainActionButtonsProps) => {
  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  const buttonSize = 'sm';
  
  if (isMobile) {
    // Mobile layout - stacked buttons in dropdown
    return (
      <div className="space-y-3">
        {/* Main action buttons */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button onClick={onAddRow} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Add Segment</span>
          </Button>
          <Button onClick={onAddHeader} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Add Header</span>
          </Button>
          <Button 
            onClick={onUndo} 
            variant="outline" 
            size={buttonSize}
            disabled={!canUndo}
            title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
            className="flex items-center justify-start gap-1.5"
          >
            <Undo className="h-4 w-4" />
            <span>Undo</span>
          </Button>
          <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
            <Eye className="h-4 w-4" />
            <span>Layouts</span>
          </Button>
        </div>


        {/* Tools and Share menus */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="w-full">
            <ToolsMenu 
              rundownId={rundownId}
              size={buttonSize}
              className="w-full justify-start"
              onShowFindReplace={onShowFindReplace}
              onShowNotes={onShowNotes}
            />
          </div>
          {rundownId && (
            <div className="w-full">
              <ShareRundownMenu 
                rundownId={rundownId} 
                rundownTitle={rundownTitle}
                rundownData={rundownData}
              />
            </div>
          )}
        </div>

        {/* Playback controls - only in mobile view */}
        {isPlaying !== undefined && onPlay && onPause && onForward && onBackward && onReset && (
          <div className="border-t pt-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Playback Controls</div>
            <div className="flex justify-center">
              <PlaybackControls
                selectedRowId={selectedRowId}
                isPlaying={isPlaying}
                currentSegmentId={currentSegmentId}
                timeRemaining={timeRemaining || 0}
                onPlay={onPlay}
                onPause={onPause}
                onForward={onForward}
                onBackward={onBackward}
                onReset={onReset}
                size="sm"
                onJumpToCurrentSegment={onJumpToCurrentSegment}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout - horizontal buttons
  const buttonClass = 'flex items-center space-x-1';
  return (
    <>
      <Button onClick={onAddRow} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Add Segment</span>
      </Button>
      <Button onClick={onAddHeader} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Add Header</span>
      </Button>
      <Button 
        onClick={onUndo} 
        variant="outline" 
        size={buttonSize}
        disabled={!canUndo}
        title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
        className={buttonClass}
      >
        <Undo className="h-4 w-4" />
        <span>Undo</span>
      </Button>
      <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className={buttonClass}>
        <Eye className="h-4 w-4" />
        <span>Layouts</span>
      </Button>
      
      <ToolsMenu rundownId={rundownId} size={buttonSize} onShowFindReplace={onShowFindReplace} onShowNotes={onShowNotes} />
      
      {rundownId && (
        <ShareRundownMenu 
          rundownId={rundownId} 
          rundownTitle={rundownTitle}
          rundownData={rundownData}
        />
      )}
    </>
  );
};

export default MainActionButtons;
