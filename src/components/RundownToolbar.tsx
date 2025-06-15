
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileToolbar from './toolbar/MobileToolbar';
import DesktopToolbar from './toolbar/DesktopToolbar';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

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
  // Share functionality
  rundownId: string | undefined;
  // Teleprompter functionality
  onOpenTeleprompter: () => void;
  // Undo functionality
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  // Rundown title for sharing
  rundownTitle?: string;
  // CSV functionality
  items?: RundownItem[];
  columns?: Column[];
  onImportItems?: (items: RundownItem[], newColumns: Column[]) => void;
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
  rundownId,
  onOpenTeleprompter,
  onUndo,
  canUndo,
  lastAction,
  rundownTitle,
  items,
  columns,
  onImportItems
}: RundownToolbarProps) => {
  const isMobile = useIsMobile();

  const commonProps = {
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
    items,
    columns,
    onImportItems
  };

  if (isMobile) {
    return <MobileToolbar {...commonProps} />;
  }

  return <DesktopToolbar {...commonProps} />;
};

export default RundownToolbar;
