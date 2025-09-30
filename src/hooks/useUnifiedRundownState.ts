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

  // Create the structured interface that matches useRundownStateCoordination
  const structuredState = useMemo(() => {
    const currentIsLoading = operationModeLoading || currentData.isLoading;
    const currentIsProcessingOperations = operationState.isProcessingOperations || false;
    const currentQueueLength = operationState.queueLength || 0;
    
    return {
      coreState: {
        // Core data
        items: currentData.items,
        columns: [], // TODO: Implement column management in operation mode
        visibleColumns: [], // TODO: Implement column management
        rundownTitle: currentData.title,
        rundownStartTime: currentData.start_time,
        timezone: currentData.timezone,
        showDate: currentData.show_date,
        currentTime: new Date().toISOString(),
        rundownId,
        
        // State flags
        isLoading: currentIsLoading,
        hasUnsavedChanges: false, // Operation mode has no "unsaved" state
        isSaving: false, // Operations are auto-saved
        isConnected: true,
        isProcessingRealtimeUpdate: currentIsProcessingOperations,
        
        // Showcaller state (placeholder for now)
        currentSegmentId: '',
        isPlaying: false,
        timeRemaining: 0,
        isController: false,
        isInitialized: !currentIsLoading,
        hasLoadedInitialState: !currentIsLoading,
        
        // Calculations
        totalRuntime: '',
        getRowNumber: () => '',
        calculateHeaderDuration: () => '',
        
        // Core actions
        updateItem: unifiedAPI.updateItem || (() => {}),
        deleteRow: unifiedAPI.deleteRow || (() => {}),
        toggleFloatRow: () => {}, // TODO: Implement
        addRow: () => unifiedAPI.addRow && unifiedAPI.addRow(0, {}),
        addHeader: () => {}, // TODO: Implement addHeader in unifiedAPI
        setTitle: (title: string) => unifiedAPI.updateGlobalField && unifiedAPI.updateGlobalField('title', title),
        setStartTime: (time: string) => unifiedAPI.updateGlobalField && unifiedAPI.updateGlobalField('start_time', time),
        setTimezone: (tz: string) => unifiedAPI.updateGlobalField && unifiedAPI.updateGlobalField('timezone', tz),
        setShowDate: (date: Date) => unifiedAPI.updateGlobalField && unifiedAPI.updateGlobalField('show_date', date),
        
        // Showcaller controls (placeholder)
        play: () => {},
        pause: () => {},
        forward: () => {},
        backward: () => {},
        reset: () => {},
        jumpToSegment: () => {},
        
        // Undo (not applicable in operation mode)
        undo: () => {},
        canUndo: false,
        lastAction: null,
        
        // Additional functions
        calculateEndTime: () => '',
        markAsChanged: () => {}, // No-op in operation mode
        addColumn: () => {},
        updateColumnWidth: () => {},
        setColumns: () => {},
        toggleHeaderCollapse: () => {},
        isHeaderCollapsed: () => false,
        getHeaderGroupItemIds: () => [],
        visibleItems: currentData.items,
        moveItemUp: () => {},
        moveItemDown: () => {},
        addRowAtIndex: () => {},
        addHeaderAtIndex: () => {},
        autoScrollEnabled: false,
        toggleAutoScroll: () => {},
        markActiveTyping: () => {}
      },
      
      interactions: {
        selectedRows: new Set<string>(),
        toggleRowSelection: () => {},
        clearSelection: () => {},
        draggedItemIndex: null,
        isDraggingMultiple: false,
        dropTargetIndex: null,
        handleDragStart: () => {},
        handleDragOver: () => {},
        handleDragLeave: () => {},
        handleDrop: () => {},
        hasClipboardData: false,
        handleCopySelectedRows: () => {},
        handlePasteRows: () => {},
        handleDeleteSelectedRows: () => {},
        handleRowSelection: () => {},
        handleAddRow: () => unifiedAPI.addRow && unifiedAPI.addRow(0, {}),
        handleAddHeader: () => {} // TODO: Implement addHeader
      },
      
      uiState: {
        showColorPicker: false,
        handleCellClick: () => {},
        handleKeyDown: () => {},
        handleToggleColorPicker: () => {},
        selectColor: () => {},
        getRowStatus: () => 'upcoming' as const,
        getColumnWidth: () => 'auto'
      },
      
      dragAndDrop: {
        draggedItemIndex: null,
        isDraggingMultiple: false,
        dropTargetIndex: null,
        handleDragStart: () => {},
        handleDragOver: () => {},
        handleDragLeave: () => {},
        handleDrop: () => {},
        handleDragEnd: () => {},
        resetDragState: () => {}
      },
      
      // Expose operation mode specific data
      operationMode: {
        isOperationMode,
        activeMode,
        canToggleMode: canToggle,
        isProcessingOperations: currentIsProcessingOperations,
        queueLength: currentQueueLength,
        enableOperationMode: enableMode,
        disableOperationMode: disableMode,
        toggleOperationMode
      }
    };
  }, [currentData, rundownId, operationModeLoading, operationState, unifiedAPI, isOperationMode, activeMode, canToggle, enableMode, disableMode, toggleOperationMode]);

  return structuredState;
};