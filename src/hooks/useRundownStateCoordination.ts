
import { useMemo } from 'react';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';

export const useRundownStateCoordination = () => {
  // Core rundown state and operations
  const basicState = useRundownBasicState();
  
  // Enhanced state with auto-save, realtime, and playback
  const integratedState = useRundownStateIntegration(basicState);
  
  // Grid-specific core functionality
  const gridCore = useRundownGridCore(integratedState);
  
  // Grid interactions (drag/drop, selection, clipboard)
  const gridInteractions = useRundownGridInteractions(gridCore);
  
  // Grid UI state (colors, editing, etc.)
  const gridUI = useRundownGridUI(gridCore);

  // Enhanced auto-save integration with showcaller activity detection
  const enhancedAutoSave = useMemo(() => {
    const { hasUnsavedChanges, isSaving, markAsChanged, setApplyingRemoteUpdate, updateSavedSignature, setShowcallerActive } = integratedState.autoSave;
    
    // Pass showcaller activity to auto-save
    if (setShowcallerActive && integratedState.playback.isPlaying !== undefined) {
      setShowcallerActive(integratedState.playback.isPlaying);
    }
    
    return {
      hasUnsavedChanges,
      isSaving,
      markAsChanged,
      setApplyingRemoteUpdate,
      updateSavedSignature
    };
  }, [integratedState.autoSave, integratedState.playback.isPlaying]);

  // Enhanced realtime with editing state detection
  const enhancedRealtime = useMemo(() => {
    const { isConnected, trackOwnUpdate, setEditingState } = integratedState.realtime;
    
    return {
      isConnected,
      trackOwnUpdate,
      setEditingState
    };
  }, [integratedState.realtime]);

  return {
    coreState: {
      ...gridCore,
      ...enhancedAutoSave,
      ...enhancedRealtime,
      ...integratedState.playback,
      isProcessingRealtimeUpdate: integratedState.realtime.isProcessingRealtimeUpdate
    },
    interactions: gridInteractions,
    uiState: gridUI
  };
};
