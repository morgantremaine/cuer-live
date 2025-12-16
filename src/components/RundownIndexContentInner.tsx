import React, { useCallback } from 'react';
import { useTalentPresets } from '@/contexts/TalentPresetsContext';
import { useRundownKeyboardShortcuts } from '@/hooks/useRundownKeyboardShortcuts';

interface RundownIndexContentInnerProps {
  coreState: any;
  interactions: any;
  uiState: any;
  dragAndDrop: any;
  mosIntegration: any;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  userRole?: string | null;
  // All other props passed from parent
  [key: string]: any;
}

export const RundownIndexContentInner: React.FC<RundownIndexContentInnerProps> = ({
  coreState,
  interactions,
  uiState,
  dragAndDrop,
  mosIntegration,
  cellRefs,
  userRole,
  ...otherProps
}) => {
  const { talentPresets } = useTalentPresets();

  // Handle talent insertion silently
  const handleInsertTalent = useCallback((talentName: string) => {
    // Silent insert - no toast notification
  }, []);

  // Scroll to current showcaller segment
  const handleScrollToCurrentSegment = useCallback(() => {
    const currentSegmentId = coreState.currentSegmentId;
    if (!currentSegmentId) return;
    
    const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    const targetElement = scrollContainer.querySelector(`[data-item-id="${currentSegmentId}"]`);
    if (targetElement) {
      console.log('⌨️ Main Rundown: Scroll to current segment', currentSegmentId);
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [coreState.currentSegmentId]);

  // Add keyboard shortcuts including talent presets
  useRundownKeyboardShortcuts({
    onCopy: interactions.handleCopySelectedRows,
    onPaste: interactions.handlePasteRows,
    onAddRow: interactions.handleAddRow,
    onDelete: interactions.handleDeleteSelectedRows,
    selectedRows: interactions.selectedRows,
    hasClipboardData: interactions.hasClipboardData(),
    onShowcallerPlay: coreState.play,
    onShowcallerPause: coreState.pause,
    onShowcallerForward: coreState.forward,
    onShowcallerBackward: coreState.backward,
    onShowcallerReset: coreState.reset,
    isShowcallerPlaying: coreState.isPlaying,
    onUndo: coreState.undo,
    canUndo: coreState.canUndo,
    onRedo: coreState.redo,
    canRedo: coreState.canRedo,
    userRole: userRole,
    talentPresets: talentPresets,
    onInsertTalent: handleInsertTalent,
    onScrollToCurrentSegment: handleScrollToCurrentSegment
  });

  return null; // This component only sets up keyboard shortcuts
};
