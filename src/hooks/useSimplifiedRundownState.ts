
import { useState, useCallback, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useRundownUndo } from '@/hooks/useRundownUndo';
import { useRundownCalculations } from '@/hooks/useRundownCalculations';
import { useSimpleAutoSave } from '@/hooks/useSimpleAutoSave';
import { useRealtimeRundown } from '@/hooks/useRealtimeRundown';
import { useRundownBasicState } from '@/hooks/useRundownBasicState';
import { useAuth } from '@/hooks/useAuth';
import { useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

export const useSimplifiedRundownState = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Core state management
  const {
    items,
    setItems,
    columns,
    setColumns,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    timezone,
    setTimezone,
    selectedRowId,
    setSelectedRowId,
    isLoading,
    hasUnsavedChanges,
    markAsChanged
  } = useRundownBasicState();

  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);
  const [undoHistoryLoaded, setUndoHistoryLoaded] = useState(false);
  
  // Storage operations
  const { updateRundown, savedRundowns } = useRundownStorage();
  
  // Enhanced undo system with database persistence and page refresh support
  const undoSystem = useRundownUndo({
    rundownId,
    updateRundown,
    currentTitle: rundownTitle,
    currentItems: items,
    currentColumns: columns
  });

  // Auto-save system
  const autoSave = useSimpleAutoSave({
    rundownId: rundownId || '',
    title: rundownTitle,
    items,
    columns,
    startTime: rundownStartTime,
    timezone,
    updateRundown,
    hasUnsavedChanges,
    onSaveStart: () => undoSystem.setAutoSaving(true),
    onSaveComplete: () => undoSystem.setAutoSaving(false)
  });

  // Realtime collaboration
  const realtimeState = useRealtimeRundown({
    rundownId: rundownId || '',
    onItemsUpdate: (newItems: RundownItem[]) => {
      setIsProcessingRealtimeUpdate(true);
      setItems(newItems);
      setTimeout(() => setIsProcessingRealtimeUpdate(false), 500);
    },
    onTitleUpdate: setRundownTitle,
    onColumnsUpdate: setColumns,
    enabled: !!rundownId && !!user
  });

  // Calculations
  const {
    visibleColumns,
    totalRuntime,
    getRowNumber,
    getHeaderDuration
  } = useRundownCalculations(items, columns);

  // Load rundown data and undo history on mount
  useEffect(() => {
    if (!rundownId || !savedRundowns.length) return;

    const currentRundown = savedRundowns.find(r => r.id === rundownId);
    if (!currentRundown) return;

    logger.log('📚 Loading rundown data:', currentRundown.title);
    
    // Load main rundown data
    setItems(currentRundown.items || []);
    setColumns(currentRundown.columns || []);
    setRundownTitle(currentRundown.title);
    setRundownStartTime(currentRundown.start_time || RUNDOWN_DEFAULTS.DEFAULT_START_TIME);
    setTimezone(currentRundown.timezone || RUNDOWN_DEFAULTS.DEFAULT_TIMEZONE);

    // Load undo history from database
    if (currentRundown.undo_history && !undoHistoryLoaded) {
      logger.log('🔄 Loading undo history from database:', currentRundown.undo_history.length, 'states');
      undoSystem.loadUndoHistory(currentRundown.undo_history);
      setUndoHistoryLoaded(true);
    }
    
  }, [rundownId, savedRundowns, undoSystem, setItems, setColumns, setRundownTitle, setRundownStartTime, setTimezone, undoHistoryLoaded]);

  // Core item operations with undo support
  const updateItem = useCallback((id: string, field: string, value: string) => {
    // Save undo state before making changes
    undoSystem.saveState(items, columns, rundownTitle, `Update ${field}`);
    
    const newItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(newItems);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setItems, markAsChanged]);

  const addItem = useCallback((newItem: RundownItem, insertIndex?: number) => {
    undoSystem.saveState(items, columns, rundownTitle, 'Add item');
    
    let newItems;
    if (insertIndex !== undefined) {
      newItems = [...items];
      newItems.splice(insertIndex, 0, newItem);
    } else {
      newItems = [...items, newItem];
    }
    setItems(newItems);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setItems, markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    undoSystem.saveState(items, columns, rundownTitle, 'Delete row');
    
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setItems, markAsChanged]);

  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION,
      endTime: '',
      elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
      isFloating: false
    };
    addItem(newItem);
  }, [addItem]);

  const addHeader = useCallback(() => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: 'A',
      name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
      endTime: '',
      elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
      isFloating: false
    };
    addItem(newItem);
  }, [addItem]);

  const addRowAtIndex = useCallback((insertIndex: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION,
      endTime: '',
      elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
      isFloating: false
    };
    addItem(newItem, insertIndex);
  }, [addItem]);

  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: 'A',
      name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
      endTime: '',
      elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
      isFloating: false
    };
    addItem(newItem, insertIndex);
  }, [addItem]);

  const toggleFloat = useCallback((id: string) => {
    undoSystem.saveState(items, columns, rundownTitle, 'Toggle float');
    
    const newItems = items.map(item =>
      item.id === id ? { ...item, isFloating: !item.isFloating } : item
    );
    setItems(newItems);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setItems, markAsChanged]);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    undoSystem.saveState(items, columns, rundownTitle, `Delete ${ids.length} items`);
    
    const newItems = items.filter(item => !ids.includes(item.id));
    setItems(newItems);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setItems, markAsChanged]);

  const setTitle = useCallback((newTitle: string) => {
    undoSystem.saveState(items, columns, rundownTitle, 'Change title');
    setRundownTitle(newTitle);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setRundownTitle, markAsChanged]);

  const addColumn = useCallback((column: Column) => {
    undoSystem.saveState(items, columns, rundownTitle, 'Add column');
    setColumns([...columns, column]);
    markAsChanged();
  }, [items, columns, rundownTitle, undoSystem, setColumns, markAsChanged]);

  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, width } : col
    );
    setColumns(newColumns);
    markAsChanged();
  }, [columns, setColumns, markAsChanged]);

  // Enhanced undo function that uses the undo system
  const undo = useCallback(() => {
    return undoSystem.undo(setItems, setColumns, setRundownTitle);
  }, [undoSystem, setItems, setColumns, setRundownTitle]);

  // Row selection handlers
  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(selectedRowId === itemId ? null : itemId);
  }, [selectedRowId, setSelectedRowId]);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, [setSelectedRowId]);

  return {
    // Core data
    items,
    setItems,
    columns,
    setColumns,
    visibleColumns,
    rundownTitle,
    rundownStartTime,
    timezone,
    currentTime: new Date(),
    rundownId: rundownId || null,
    
    // State flags
    isLoading,
    hasUnsavedChanges,
    isSaving: autoSave.isSaving,
    isConnected: realtimeState.isConnected,
    isProcessingRealtimeUpdate,
    
    // Calculations
    totalRuntime,
    getRowNumber,
    getHeaderDuration,
    
    // Core actions
    updateItem,
    deleteRow,
    toggleFloat,
    deleteMultipleItems,
    addItem,
    setTitle,
    setStartTime: setRundownStartTime,
    setTimezone,
    addRow,
    addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    
    // Column management
    addColumn,
    updateColumnWidth,
    setColumns,
    
    // Enhanced undo functionality with persistence
    undo,
    canUndo: undoSystem.canUndo,
    lastAction: undoSystem.lastAction,
    
    // Selection state
    selectedRowId,
    handleRowSelection,
    clearRowSelection
  };
};
