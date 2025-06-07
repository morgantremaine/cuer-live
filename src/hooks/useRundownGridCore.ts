
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownCalculations } from './useRundownCalculations';
import { useRundownHandlers } from './useRundownHandlers';
import { useColumnsManager } from './useColumnsManager';
import { useTimeCalculations } from './useTimeCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { useRealtimeRundownSync } from './useRealtimeRundownSync';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStateIntegration } from './useRundownStateIntegration';

export const useRundownGridCore = () => {
  // Basic state management
  const {
    rundownId,
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    currentTime,
    showColumnManager,
    setShowColumnManager,
    markAsChanged
  } = useRundownBasicState();

  // State integration with auto-save
  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving
  } = useRundownStateIntegration(rundownTitle, timezone, rundownStartTime);

  // Calculations
  const { calculateEndTime } = useRundownCalculations();

  // Columns management
  const { } = useColumnsManager();

  // Time calculations
  const { getRowStatus } = useTimeCalculations(
    items,
    rundownStartTime,
    timezone
  );

  // Playback controls - now properly integrated
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items);

  // Data loading
  const { } = useRundownDataLoader(
    rundownId,
    setItems,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout
  );

  // Realtime sync
  const { updateLastUpdateTime, updateTrigger, forceRenderTrigger } = useRealtimeRundownSync({
    rundownId,
    currentUserId: null, // This should come from auth context
    setItems,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout,
    markAsChanged
  });

  // Handlers - simplified signature
  const {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  } = useRundownHandlers({
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    setItems,
    calculateEndTime,
    selectColor: (id: string, color: string) => {
      updateItem(id, 'color', color);
    },
    markAsChanged
  });

  // Simple title change handler
  const handleTitleChange = (title: string) => {
    setRundownTitle(title);
    markAsChanged();
  };

  return {
    // Core state
    rundownId,
    rundownTitle,
    setRundownTitle: handleTitleChange,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    hasUnsavedChanges,
    isSaving,
    markAsChanged,
    currentTime,
    showColumnManager,
    setShowColumnManager,
    
    // Items
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    calculateEndTime,
    
    // Columns
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    
    // Time
    getRowStatus,
    
    // Playback controls
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    selectedRowId: null, // Add default for now
    
    // Handlers
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup,
    
    // Realtime triggers
    updateTrigger,
    forceRenderTrigger,

    // Add missing properties for undo functionality
    handleUndo: () => {}, // Placeholder
    canUndo: false,
    lastAction: null as string | null,

    // Add missing realtime collaboration properties
    isConnected: true,
    hasPendingChanges: false,
    isEditing: false
  };
};
