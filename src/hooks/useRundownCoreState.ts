
import { useMemo, useCallback } from 'react';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownDataManagement } from './useRundownDataManagement';
import { useRundownCalculations } from './useRundownCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { useColumnsManager } from './useColumnsManager';
import { useRundownUndo } from './useRundownUndo';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useParams } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';

export const useRundownCoreState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;

  // Basic state management
  const basicState = useRundownBasicState();
  
  // Data management (items, CRUD operations) - fix: only pass markAsChanged
  const dataManagement = useRundownDataManagement(basicState.markAsChanged);
  
  // Calculations (time, totals, etc.) - fix: pass the required parameters
  const calculations = useRundownCalculations(dataManagement.items, basicState.rundownStartTime, basicState.timezone);
  
  // Playback controls - fix: pass the required parameters  
  const playback = usePlaybackControls(dataManagement.items, basicState.rundownStartTime, basicState.timezone);
  
  // Column management
  const columns = useColumnsManager(basicState.markAsChanged);

  // Undo system
  const undo = useRundownUndo({
    rundownId,
    updateRundown: undefined, // Will be set by auto-save
    currentTitle: basicState.rundownTitle,
    currentItems: dataManagement.items,
    currentColumns: columns.columns
  });

  // Auto-save operations
  const autoSave = useAutoSaveOperations();

  // Data loading
  useRundownDataLoader({
    rundownId,
    savedRundowns: [], // This will be populated by the storage hook
    loading: false,
    setRundownTitle: basicState.setRundownTitleDirectly,
    setTimezone: basicState.setTimezoneDirectly,
    setRundownStartTime: basicState.setRundownStartTime,
    handleLoadLayout: columns.handleLoadLayout,
    setItems: dataManagement.setItems,
    onRundownLoaded: (rundown) => {
      if (rundown.undo_history) {
        undo.loadUndoHistory(rundown.undo_history);
      }
    }
  });

  // Add selectColor function
  const selectColor = useCallback((id: string, color: string) => {
    dataManagement.updateItem(id, 'color', color);
    basicState.markAsChanged();
  }, [dataManagement.updateItem, basicState.markAsChanged]);

  // Add handleUndo function
  const handleUndo = useCallback(() => {
    const action = undo.undo(
      dataManagement.setItems, 
      columns.handleLoadLayout, 
      basicState.setRundownTitleDirectly
    );
    if (action) {
      basicState.markAsChanged();
      console.log(`Undid: ${action}`);
    }
  }, [undo, dataManagement.setItems, columns.handleLoadLayout, basicState.setRundownTitleDirectly, basicState.markAsChanged]);

  // Add hasUnsavedChanges state
  const hasUnsavedChanges = false; // This should come from auto-save or change tracking

  return useMemo(() => ({
    // Basic state
    ...basicState,
    rundownId,
    
    // Data management
    ...dataManagement,
    
    // Calculations - include calculateEndTime
    ...calculations,
    
    // Playback
    ...playback,
    
    // Columns
    ...columns,
    
    // Auto-save state
    hasUnsavedChanges,
    isSaving: autoSave.isSaving,

    // Color selection
    selectColor,

    // Undo functionality
    handleUndo,
    canUndo: undo.canUndo,
    lastAction: undo.lastAction,
    saveState: undo.saveState,
    undo: undo.undo,
    loadUndoHistory: undo.loadUndoHistory
  }), [
    basicState,
    rundownId,
    dataManagement,
    calculations,
    playback,
    columns,
    hasUnsavedChanges,
    autoSave.isSaving,
    selectColor,
    handleUndo,
    undo.canUndo,
    undo.lastAction,
    undo.saveState,
    undo.undo,
    undo.loadUndoHistory
  ]);
};
