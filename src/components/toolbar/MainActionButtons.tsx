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

import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';

interface MainActionButtonsProps {
  onAddRow: (count?: number) => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  rundownId: string | undefined;
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
  onRedo,
  canRedo,
  nextRedoAction,
  rundownId,
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription_tier, access_type } = useSubscription();

  // Cooldown states for Add buttons
  const [addRowCooldown, setAddRowCooldown] = useState(false);
  const [addHeaderCooldown, setAddHeaderCooldown] = useState(false);
  const [segmentCountInput, setSegmentCountInput] = useState('1');

  // Check if user is on free tier
  const isFreeUser = (subscription_tier === 'Free' || subscription_tier === null) && 
                    (access_type === 'free' || access_type === 'none');

  // Handle segment count change - allow empty or valid numbers
  const handleSegmentCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string or valid numbers (including partial input like just typing digits)
    if (value === '') {
      setSegmentCountInput('');
    } else if (/^\d+$/.test(value)) {
      const num = parseInt(value);
      // Only accept if within valid range
      if (num >= 1 && num <= 50) {
        setSegmentCountInput(value);
      } else if (num > 50) {
        setSegmentCountInput('50');
      }
    }
  };

  // Validate and clamp on blur
  const handleSegmentCountBlur = () => {
    if (segmentCountInput === '' || segmentCountInput === '0') {
      setSegmentCountInput('1');
    } else {
      const num = parseInt(segmentCountInput);
      const clamped = Math.max(1, Math.min(50, num));
      setSegmentCountInput(clamped.toString());
    }
  };

  // Wrapper functions with cooldown logic
  const handleAddRowWithCooldown = useCallback(() => {
    if (addRowCooldown) return;
    
    setAddRowCooldown(true);
    const count = segmentCountInput === '' ? 1 : parseInt(segmentCountInput);
    onAddRow(Math.max(1, Math.min(50, count)));
    
    setTimeout(() => {
      setAddRowCooldown(false);
    }, 500);
  }, [addRowCooldown, onAddRow, segmentCountInput]);

  const handleAddHeaderWithCooldown = useCallback(() => {
    if (addHeaderCooldown) return;
    
    setAddHeaderCooldown(true);
    onAddHeader();
    
    setTimeout(() => {
      setAddHeaderCooldown(false);
    }, 500);
  }, [addHeaderCooldown, onAddHeader]);
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
          <Button 
            onClick={handleAddRowWithCooldown} 
            variant="outline" 
            size={buttonSize} 
            disabled={addRowCooldown} 
            className="flex items-center justify-start gap-1.5 px-2"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            <input
              type="text"
              inputMode="numeric"
              value={segmentCountInput}
              onChange={handleSegmentCountChange}
              onBlur={handleSegmentCountBlur}
              onClick={(e) => e.stopPropagation()}
              className="w-10 text-center bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            <span className="flex-shrink-0">Segment</span>
          </Button>
          <Button onClick={handleAddHeaderWithCooldown} variant="outline" size={buttonSize} disabled={addHeaderCooldown} className="flex items-center justify-start gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Header</span>
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
          <Button 
            onClick={onRedo} 
            variant="outline" 
            size={buttonSize}
            disabled={!canRedo}
            title={nextRedoAction ? `Redo: ${nextRedoAction}` : 'Nothing to redo'}
            className="flex items-center justify-start gap-1.5"
          >
            <span>Redo</span>
            <Redo className="h-4 w-4" />
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
      <Button 
        onClick={handleAddRowWithCooldown} 
        variant="outline" 
        size={buttonSize} 
        disabled={addRowCooldown} 
        className="flex items-center gap-1 px-2"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <input
          type="text"
          inputMode="numeric"
          value={segmentCountInput}
          onChange={handleSegmentCountChange}
          onBlur={handleSegmentCountBlur}
          onClick={(e) => e.stopPropagation()}
          className="w-10 text-center bg-transparent border-none outline-none focus:ring-0 p-0"
        />
        <span className="flex-shrink-0">Segment</span>
      </Button>
      <Button onClick={handleAddHeaderWithCooldown} variant="outline" size={buttonSize} disabled={addHeaderCooldown} className={buttonClass}>
        <Plus className="h-4 w-4" />
        <span>Header</span>
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
      <Button 
        onClick={onRedo} 
        variant="outline" 
        size={buttonSize}
        disabled={!canRedo}
        title={nextRedoAction ? `Redo: ${nextRedoAction}` : 'Nothing to redo'}
        className={buttonClass}
      >
        <span>Redo</span>
        <Redo className="h-4 w-4" />
      </Button>
      <Button onClick={onShowColumnManager} variant="outline" size={buttonSize} className={buttonClass}>
        <Eye className="h-4 w-4" />
        <span>Layouts</span>
      </Button>
      <Button onClick={handleOpenBlueprint} variant="outline" size={buttonSize} className={buttonClass}>
        <FileText className="h-4 w-4" />
        <span>Blueprint</span>
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
