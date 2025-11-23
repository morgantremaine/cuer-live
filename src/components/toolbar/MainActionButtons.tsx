import React, { useState, useCallback } from 'react';
import { Plus, Eye, Undo, Redo, MapPin, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ShareRundownMenu } from '@/components/ShareRundownMenu';
import { ToolsMenu } from './ToolsMenu';
import PlaybackControls from './PlaybackControls';
import { CSVExportData } from '@/utils/csvExport';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { NumberLockButton } from './NumberLockButton';

import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface MainActionButtonsProps {
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
  onShowHistory?: () => void;
  // Row number locking
  numberingLocked?: boolean;
  onToggleLock?: () => void;
  userRole?: 'admin' | 'manager' | 'member' | 'showcaller' | 'teleprompter' | null;
}

const MainActionButtons = ({
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
  onShowNotes,
  onShowHistory,
  numberingLocked = false,
  onToggleLock,
  userRole
}: MainActionButtonsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription_tier, access_type } = useSubscription();

  // Check if user is on free tier
  const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                    (access_type === 'free' || access_type === 'none');

  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  const handleOpenBlueprint = () => {
    if (!rundownId) {
      toast({
        title: "Cannot open blueprint",
        description: "Save this rundown first before opening blueprint.",
        variant: "destructive"
      });
      return;
    }

    // Check if this is the demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      toast({
        title: "Subscribe to unlock full features",
        description: "Blueprint mode is available with a subscription. Try the full experience!",
        variant: "default"
      });
      return;
    }

    navigate(`/rundown/${rundownId}/blueprint`);
  };


  const buttonSize = 'sm';
  
  if (isMobile) {
    // Mobile layout - stacked buttons in dropdown
    return (
      <div className="space-y-3">
        {/* Main action buttons */}
        <div className="grid grid-cols-2 gap-2 w-full">
        {onToggleLock && (
          <div className="col-span-2">
            <NumberLockButton 
              isLocked={numberingLocked} 
              onToggle={onToggleLock}
              size={buttonSize}
              className="w-full justify-start"
            />
          </div>
        )}
        {/* Undo/Redo Button Group - spans 2 columns */}
        <div className="col-span-2 inline-flex rounded-md shadow-sm w-full" role="group">
          <Button 
            onClick={onUndo} 
            variant="outline" 
            size={buttonSize}
            disabled={!canUndo}
            title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
            className="flex-1 rounded-r-none border-r-0 justify-center"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onRedo} 
            variant="outline" 
            size={buttonSize}
            disabled={!canRedo}
            title={nextRedoAction ? `Redo: ${nextRedoAction}` : 'Nothing to redo'}
            className="flex-1 rounded-l-none justify-center"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onAddRow} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Segment</span>
        </Button>
        <Button onClick={onAddHeader} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Header</span>
        </Button>
          <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
            <Eye className="h-4 w-4" />
            <span>Layouts</span>
          </Button>
          <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className="flex items-center justify-start gap-1.5">
            <FileText className="h-4 w-4" />
            <span>Blueprint</span>
          </Button>
        </div>


        {/* Tools and Share menus */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="w-full">
            <ToolsMenu 
              rundownId={rundownId}
              teamId={teamId}
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

        {/* Playback controls - only in mobile view and for admin/manager/showcaller */}
        {isPlaying !== undefined && onPlay && onPause && onForward && onBackward && onReset && 
         (userRole === 'admin' || userRole === 'manager' || userRole === 'showcaller') && (
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
      {onToggleLock && (
        <NumberLockButton 
          isLocked={numberingLocked} 
          onToggle={onToggleLock}
          size={buttonSize}
        />
      )}
      {/* Undo/Redo Button Group */}
      <div className="inline-flex rounded-md shadow-sm" role="group">
        <Button 
          onClick={onUndo} 
          variant="outline" 
          size={buttonSize}
          disabled={!canUndo}
          title={lastAction ? `Undo: ${lastAction}` : 'Nothing to undo'}
          className="rounded-r-none border-r-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button 
          onClick={onRedo} 
          variant="outline" 
          size={buttonSize}
          disabled={!canRedo}
          title={nextRedoAction ? `Redo: ${nextRedoAction}` : 'Nothing to redo'}
          className="rounded-l-none"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={onAddRow} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Segment</span>
      </Button>
      <Button onClick={onAddHeader} variant="outline" size={buttonSize} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Header</span>
      </Button>
      <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className={buttonClass}>
        <Eye className="h-4 w-4" />
        <span>Layouts</span>
      </Button>
      <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className={buttonClass}>
        <FileText className="h-4 w-4" />
        <span>Blueprint</span>
      </Button>
      
      <ToolsMenu rundownId={rundownId} teamId={teamId} size={buttonSize} onShowFindReplace={onShowFindReplace} onShowNotes={onShowNotes} onShowHistory={onShowHistory} />
      
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
