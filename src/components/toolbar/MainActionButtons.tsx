
import React, { useState } from 'react';
import { Plus, Eye, Undo, MapPin, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onAddRow: (selectedRowId?: string | null, count?: number) => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
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
  const [rowCount, setRowCount] = useState<string>("1");
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

  const handleAddRows = () => {
    const count = parseInt(rowCount, 10);
    console.log('🟢 handleAddRows called with rowCount:', rowCount, 'parsed count:', count);
    if (count > 0 && count <= 50) {
      console.log('🟢 Calling onAddRow with count:', count);
      onAddRow(null, count);
    } else {
      console.log('🔴 Invalid count:', count);
    }
  };

  const handleRowCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 50)) {
      setRowCount(value);
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
          <div className="flex items-center gap-1">
            <Button
              onClick={handleAddRows}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              <Input
                type="number"
                min="1"
                max="50"
                value={rowCount}
                onChange={handleRowCountChange}
                className="w-12 h-6 px-1 text-center"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="ml-1">Segment{parseInt(rowCount) !== 1 ? 's' : ''}</span>
            </Button>
          </div>
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
      <div className="flex items-center gap-1">
        <Button
          onClick={handleAddRows}
          variant="outline"
          size={buttonSize}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <Input
            type="number"
            min="1"
            max="50"
            value={rowCount}
            onChange={handleRowCountChange}
            className="w-12 h-7 px-1 text-center text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <span>Segment{parseInt(rowCount) !== 1 ? 's' : ''}</span>
        </Button>
      </div>
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
