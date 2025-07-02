
import React, { useState } from 'react';
import { useResponsiveLayout } from '@/hooks/use-mobile';
import MobileToolbar from './toolbar/MobileToolbar';
import TabletToolbar from './toolbar/TabletToolbar';
import DesktopToolbar from './toolbar/DesktopToolbar';
import FindReplaceDialog from './FindReplaceDialog';
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
  // Rundown title for sharing
  rundownTitle?: string;
  // Rundown data for CSV export
  rundownData?: CSVExportData;
  // Autoscroll functionality
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  // Find and replace functionality
  items?: any[];
  onUpdateItem?: (id: string, field: string, value: string) => void;
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
  rundownTitle,
  rundownData,
  autoScrollEnabled,
  onToggleAutoScroll,
  items = [],
  onUpdateItem
}: RundownToolbarProps) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  
  // Find and replace state
  const [showFindReplace, setShowFindReplace] = useState(false);

  const handleOpenFindReplace = () => {
    setShowFindReplace(true);
  };

  const handleCloseFindReplace = () => {
    setShowFindReplace(false);
  };

  // Debug logging
  console.log('RundownToolbar - onUpdateItem:', !!onUpdateItem, 'items length:', items.length);

  // Always show find/replace button for now to debug
  const showFindReplaceButton = true; // Changed from !!onUpdateItem to always show

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
    onReset,
    rundownTitle,
    rundownData,
    autoScrollEnabled,
    onToggleAutoScroll,
    onOpenFindReplace: showFindReplaceButton ? handleOpenFindReplace : undefined
  };

  return (
    <>
      {isMobile && <MobileToolbar {...commonProps} />}
      {isTablet && <TabletToolbar {...commonProps} />}
      {!isMobile && !isTablet && <DesktopToolbar {...commonProps} />}
      
      {/* Find and Replace Dialog */}
      {showFindReplaceButton && (
        <FindReplaceDialog
          isOpen={showFindReplace}
          onClose={handleCloseFindReplace}
          items={items}
          onUpdateItem={onUpdateItem || ((id, field, value) => console.log('Mock update:', id, field, value))}
        />
      )}
    </>
  );
};

export default RundownToolbar;
