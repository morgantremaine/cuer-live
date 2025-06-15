
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileToolbar from './toolbar/MobileToolbar';
import DesktopToolbar from './toolbar/DesktopToolbar';
import { CSVExportData } from '@/utils/csvExport';
import { CSVImportResult } from '@/utils/csvImport';
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
  // Rundown data for CSV export
  rundownData?: CSVExportData;
  // CSV import functionality
  onCSVImport?: (result: CSVImportResult) => void;
  existingColumns?: Column[];
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
  rundownData,
  onCSVImport,
  existingColumns
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
    rundownData,
    onCSVImport,
    existingColumns
  };

  if (isMobile) {
    return <MobileToolbar {...commonProps} />;
  }

  return <DesktopToolbar {...commonProps} />;
};

export default RundownToolbar;
