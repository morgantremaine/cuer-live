
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
  teamId?: string;
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
  userRole?: string | null;
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
  teamId,
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
  onShowHistory,
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
  onToggleLock,
  userRole
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
    teamId,
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
    onShowHistory,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    canZoomIn,
    canZoomOut,
    isDefaultZoom,
    numberingLocked,
    onToggleLock,
    userRole
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
