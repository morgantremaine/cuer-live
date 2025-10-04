
import React from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import MobileToolbar from './toolbar/MobileToolbar';
import TabletToolbar from './toolbar/TabletToolbar';
import DesktopToolbar from './toolbar/DesktopToolbar';
import { CSVExportData } from '@/utils/csvExport';

interface RundownToolbarProps {
  onAddRow: () => void;
  onAddHeader: () => void;
  onShowColumnManager: () => void;
  // Playback controls
  selectedRowId: string | null;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  onPlay: (selectedSegmentId?: string) => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
  onReset: () => void;
  // Share functionality
  rundownId: string | undefined;
  // Teleprompter functionality
  onOpenTeleprompter: () => void;
  // Undo functionality
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  // Redo functionality
  onRedo: () => void;
  canRedo: boolean;
  nextRedoAction: string | null;
  // Rundown title for sharing
  rundownTitle?: string;
  // Rundown data for CSV export
  rundownData?: CSVExportData;
  // Autoscroll functionality
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
  // Row number locking
  numberingLocked?: boolean;
  onToggleLock?: () => void;
}

const RundownToolbar = ({
  onAddRow,
  onAddHeader,
  onShowColumnManager,
  selectedRowId,
  isPlaying,
  currentSegmentId,
  timeRemaining,
  onPlay,
  onPause,
  onForward,
  onBackward,
  onReset,
  rundownId,
  onOpenTeleprompter,
  onUndo,
  canUndo,
  lastAction,
  onRedo,
  canRedo,
  nextRedoAction,
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
  isDefaultZoom,
  // Lock props
  numberingLocked,
  onToggleLock
}: RundownToolbarProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();

  const commonProps = {
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
    onShowNotes,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    canZoomIn,
    canZoomOut,
    isDefaultZoom,
    numberingLocked,
    onToggleLock
  };

  if (isMobile) {
    return <MobileToolbar {...commonProps} />;
  }

  if (isTablet) {
    return <TabletToolbar {...commonProps} />;
  }

  return <DesktopToolbar {...commonProps} />;
};

export default RundownToolbar;
