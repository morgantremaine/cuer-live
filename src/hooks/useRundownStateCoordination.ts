
import { useParams } from 'react-router-dom';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useSimpleAutoSave } from './useSimpleAutoSave';

export const useRundownStateCoordination = () => {
  const params = useParams<{ id: string }>();
  const urlRundownId = (!params.id || params.id === 'new' || params.id === ':id' || params.id.trim() === '') ? null : params.id;
  
  // Basic state management
  const basicState = useRundownBasicState();
  
  // Create a simple state object for auto-save
  const stateForAutoSave = {
    items: [], // Will be populated by gridCore
    columns: [], // Will be populated by gridCore
    title: basicState.rundownTitle,
    startTime: basicState.rundownStartTime,
    timezone: basicState.timezone,
    hasUnsavedChanges: false,
    lastChanged: 0,
    currentSegmentId: null,
    isPlaying: false
  };
  
  // Simple onSaved callback
  const onSaved = () => {
    console.log('✅ Rundown saved successfully');
  };
  
  // Auto-save with effective rundown ID tracking
  const { isSaving, setUndoActive, effectiveRundownId } = useSimpleAutoSave(
    stateForAutoSave,
    urlRundownId,
    onSaved
  );
  
  // Use the effective rundown ID (either URL param or created ID)
  const actualRundownId = effectiveRundownId || urlRundownId;
  
  console.log('🔍 Rundown ID coordination:', {
    urlParam: urlRundownId,
    effective: effectiveRundownId,
    actual: actualRundownId
  });

  // Grid core functionality
  const gridCore = useRundownGridCore({
    markAsChanged: basicState.markAsChanged,
    rundownTitle: basicState.rundownTitle,
    timezone: basicState.timezone,
    rundownStartTime: basicState.rundownStartTime,
    setRundownTitleDirectly: basicState.setRundownTitleDirectly,
    setTimezoneDirectly: basicState.setTimezoneDirectly,
    setRundownStartTimeDirectly: basicState.setRundownStartTimeDirectly,
    setAutoSaveTrigger: basicState.setAutoSaveTrigger
  });

  // Grid handlers
  const gridHandlers = useRundownGridHandlers({
    updateItem: gridCore.updateItem,
    addRow: gridCore.addRow,
    addHeader: gridCore.addHeader,
    deleteRow: gridCore.deleteRow,
    toggleFloatRow: gridCore.toggleFloatRow,
    deleteMultipleRows: gridCore.deleteMultipleRows,
    addMultipleRows: gridCore.addMultipleRows,
    handleDeleteColumn: gridCore.handleDeleteColumn,
    setItems: gridCore.setItems,
    calculateEndTime: gridCore.calculateEndTime,
    selectColor: gridCore.selectColor,
    markAsChanged: basicState.markAsChanged,
    selectedRows: new Set<string>(),
    clearSelection: () => {},
    copyItems: () => {},
    clipboardItems: [],
    hasClipboardData: () => false,
    toggleRowSelection: () => {},
    items: gridCore.items || [],
    setRundownTitle: basicState.setRundownTitle
  });

  // Grid interactions
  const gridInteractions = useRundownGridInteractions(
    gridCore.items || [],
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
    gridCore.selectColor,
    basicState.markAsChanged,
    basicState.setRundownTitle
  );

  return {
    coreState: {
      // Pass the actual rundown ID to all components
      rundownId: actualRundownId,
      urlRundownId, // Keep original for reference
      effectiveRundownId,
      ...basicState,
      ...gridCore,
      ...gridHandlers,
      isSaving,
      hasUnsavedChanges: false // Will be updated by auto-save logic
    },
    interactions: {
      ...gridInteractions
    },
    uiState: {
      showColorPicker: false,
      handleCellClick: () => {},
      handleKeyDown: () => {},
      handleToggleColorPicker: () => {},
      selectColor: gridCore.selectColor || (() => {}),
      getRowStatus: () => 'upcoming',
      getColumnWidth: () => '150px',
      updateColumnWidth: () => {}
    }
  };
};
