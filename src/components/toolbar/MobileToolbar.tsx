
import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from '../ThemeToggle';
import MainActionButtons from './MainActionButtons';
import ZoomControls from './ZoomControls';
import { CSVExportData } from '@/utils/csvExport';

interface MobileToolbarProps {
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
  // Zoom controls
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  isDefaultZoom?: boolean;
}

const MobileToolbar = ({
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
  // Zoom props
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  isDefaultZoom
}: MobileToolbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleAutoScroll = (checked: boolean) => {
    if (onToggleAutoScroll) {
      onToggleAutoScroll();
    }
  };

  return (
    <div className="p-2 border-b bg-gray-50 dark:bg-gray-700">
      {/* First row - Actions dropdown, autoscroll, zoom, and theme toggle */}
      <div className="flex items-center justify-between gap-2">
        {/* Left side - Actions dropdown */}
        <div className="flex items-center gap-2">
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
                  selectedRowId={selectedRowId}
                  isMobile={true}
                  rundownTitle={rundownTitle}
                  rundownData={rundownData}
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

          {/* Autoscroll toggle on toolbar */}
          {onToggleAutoScroll && (
            <div 
              className="flex items-center space-x-1.5 px-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer h-9"
              onClick={onJumpToCurrentSegment}
              title="Jump to current segment"
            >
              <MapPin className={`h-3.5 w-3.5 transition-colors ${autoScrollEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
              <Switch
                checked={autoScrollEnabled}
                onCheckedChange={handleToggleAutoScroll}
                className="scale-75"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Right side - Zoom controls and theme toggle */}
        <div className="flex items-center gap-2">
          {/* Zoom controls on mobile */}
          {onZoomIn && onZoomOut && onResetZoom && (
            <ZoomControls
              zoomLevel={zoomLevel || 1}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onResetZoom={onResetZoom}
              canZoomIn={canZoomIn || false}
              canZoomOut={canZoomOut || false}
              isDefaultZoom={isDefaultZoom || false}
              size="sm"
            />
          )}

          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default MobileToolbar;
