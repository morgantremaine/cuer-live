import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import RundownContainer from '@/components/RundownContainer';
import { useTalentPresets } from '@/contexts/TalentPresetsContext';
import { useRundownKeyboardShortcuts } from '@/hooks/useRundownKeyboardShortcuts';
import { toast } from 'sonner';

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

  // Add keyboard shortcuts including talent presets
  useRundownKeyboardShortcuts({
    onCopy: interactions.handleCopySelectedRows,
    onPaste: interactions.handlePasteRows,
    onAddRow: interactions.handleAddRow,
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
    onInsertTalent: handleInsertTalent
  });

  return null; // This component only sets up keyboard shortcuts
};
