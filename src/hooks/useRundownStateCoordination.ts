
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
  const integratedState = useRundownStateIntegration(
    basicState.markAsChanged,
    basicState.rundownTitle,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.setRundownTitleDirectly,
    basicState.setTimezoneDirectly,
    false // isProcessingRealtimeUpdate - will be set by gridCore
  );
  
  // Grid-specific core functionality
  const gridCore = useRundownGridCore(integratedState);
  
  // Grid interactions (drag/drop, selection, clipboard)
  const gridInteractions = useRundownGridInteractions(
    gridCore.items,
    gridCore.setItems,
    gridCore.updateItem,
    gridCore.addRow,
    gridCore.addHeader,
    gridCore.deleteRow,
    gridCore.toggleFloatRow,
    gridCore.deleteMultipleRows,
    gridCore.addMultipleRows,
    gridCore.handleDeleteColumn,
    gridCore.calculateEndTime,
    (id: string, color: string) => {
      gridCore.updateItem(id, 'color', color);
    },
    gridCore.markAsChanged,
    gridCore.setRundownTitle
  );
  
  // Grid UI state (colors, editing, etc.)
  const gridUI = useRundownGridUI(
    gridCore.items,
    gridCore.visibleColumns,
    gridCore.columns,
    gridCore.updateItem,
    gridCore.currentSegmentId,
    gridCore.currentTime,
    gridCore.markAsChanged
  );

  // Enhanced auto-save integration with showcaller activity detection
  const enhancedAutoSave = useMemo(() => {
    const { hasUnsavedChanges, isSaving, markAsChanged, setApplyingRemoteUpdate, updateSavedSignature } = gridCore;
    
    return {
      hasUnsavedChanges,
      isSaving,
      markAsChanged,
      setApplyingRemoteUpdate,
      updateSavedSignature
    };
  }, [gridCore.hasUnsavedChanges, gridCore.isSaving, gridCore.markAsChanged, gridCore.setApplyingRemoteUpdate, gridCore.updateSavedSignature]);

  // Enhanced realtime with editing state detection
  const enhancedRealtime = useMemo(() => {
    const { isConnected, isProcessingRealtimeUpdate } = gridCore;
    
    return {
      isConnected,
      isProcessingRealtimeUpdate
    };
  }, [gridCore.isConnected, gridCore.isProcessingRealtimeUpdate]);

  return {
    coreState: {
      ...basicState,
      ...gridCore,
      ...enhancedAutoSave,
      ...enhancedRealtime
    },
    interactions: gridInteractions,
    uiState: gridUI
  };
};
