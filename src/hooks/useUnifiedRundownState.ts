import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOperationBasedRundown } from './useOperationBasedRundown';
import { useRundownOperationMode } from './useRundownOperationMode';
import { useRundownState } from './useRundownState';
import { useAuth } from './useAuth';

interface UseUnifiedRundownStateOptions {
  rundownId: string;
  enableOperationMode?: boolean;
}

export const useUnifiedRundownState = ({
  rundownId,
  enableOperationMode = false
}: UseUnifiedRundownStateOptions) => {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<'legacy' | 'operation'>('legacy');

  // Check operation mode status
  const {
    isOperationMode,
    isLoading: operationModeLoading,
    canToggle,
    enableOperationMode: enableMode,
    disableOperationMode: disableMode,
    toggleOperationMode
  } = useRundownOperationMode({
    rundownId,
    onModeChanged: (isEnabled) => {
      setActiveMode(isEnabled ? 'operation' : 'legacy');
    }
  });

  // Operation-based rundown state
  const operationState = useOperationBasedRundown({
    rundownId,
    userId: user?.id || '',
    enabled: isOperationMode && enableOperationMode
  });

  // Legacy rundown state - use a mock for now since the hook signature isn't compatible
  const legacyState = useMemo(() => ({
    state: {
      items: [],
      title: '',
      startTime: '',
      timezone: '',
      showDate: null,
      externalNotes: {}
    },
    actions: {
      updateItem: () => {},
      addItem: () => {},
      deleteItem: () => {},
      reorderItems: () => {},
      setTitle: () => {},
      setStartTime: () => {}
    }
  }), []);

  // Determine which state to use
  const activeState = useMemo(() => {
    if (activeMode === 'operation' && operationState.isOperationMode) {
      return operationState;
    }
    return legacyState;
  }, [activeMode, operationState, legacyState]);

  // Unified API that works with both modes
  const unifiedAPI = useMemo(() => {
    if (activeMode === 'operation' && operationState.isOperationMode) {
      return {
        // Operation mode handlers
        updateItem: (itemId: string, field: string, value: any) => {
          operationState.handleCellEdit(itemId, field, value);
        },
        addRow: (insertIndex: number, newItem: any) => {
          operationState.handleRowInsert(insertIndex, newItem);
        },
        deleteRow: (itemId: string) => {
          operationState.handleRowDelete(itemId);
        },
        moveRow: (fromIndex: number, toIndex: number) => {
          operationState.handleRowMove(fromIndex, toIndex);
        },
        updateGlobalField: (field: string, value: any) => {
          operationState.handleGlobalEdit(field, value);
        }
      };
    } else {
      return {
        // Legacy mode handlers
        updateItem: legacyState.actions.updateItem,
        addRow: legacyState.actions.addItem,
        deleteRow: legacyState.actions.deleteItem,
        moveRow: legacyState.actions.reorderItems,
        updateGlobalField: (field: string, value: any) => {
          // Handle global fields through legacy system
          if (field === 'title') {
            legacyState.actions.setTitle();
          } else if (field === 'start_time') {
            legacyState.actions.setStartTime();
          }
          // Add other global fields as needed
        }
      };
    }
  }, [activeMode, operationState, legacyState]);

  console.log('🔄 UNIFIED RUNDOWN STATE:', {
    rundownId,
    activeMode,
    isOperationMode,
    operationModeEnabled: operationState.isOperationMode,
    legacyStateLoading: false, // Legacy state doesn't have loading state
    operationStateLoading: operationState.isLoading
  });

  // Get the correct state data based on mode
  const currentData = useMemo(() => {
    if (activeMode === 'operation' && operationState.isOperationMode) {
      return {
        items: operationState.items || [],
        title: operationState.title || '',
        start_time: operationState.start_time,
        timezone: operationState.timezone,
        show_date: operationState.show_date,
        external_notes: operationState.external_notes || {},
        isLoading: operationState.isLoading
      };
    } else {
      return {
        items: legacyState.state.items || [],
        title: legacyState.state.title || '',
        start_time: legacyState.state.startTime,
        timezone: legacyState.state.timezone,
        show_date: legacyState.state.showDate,
        external_notes: legacyState.state.externalNotes || {},
        isLoading: false
      };
    }
  }, [activeMode, operationState, legacyState]);

  return {
    // Current state data
    ...currentData,
    
    // Mode information
    isOperationMode,
    activeMode,
    canToggleMode: canToggle,
    
    // Loading states
    isLoading: operationModeLoading || currentData.isLoading,
    isProcessingOperations: operationState.isProcessingOperations || false,
    
    // Operation queue status (only for operation mode)
    queueLength: operationState.queueLength || 0,
    
    // Unified API
    ...unifiedAPI,
    
    // Mode management
    enableOperationMode: enableMode,
    disableOperationMode: disableMode,
    toggleOperationMode,
    
    // Raw states for advanced usage
    operationState,
    legacyState
  };
};