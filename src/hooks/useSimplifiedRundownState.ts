
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useRundownStorage } from './useRundownStorage';
import { useRealtimeRundown } from './useRealtimeRundown';
import { usePlaybackControls } from './usePlaybackControls';
import { useRundownCalculations } from './useRundownCalculations';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useAutoSave } from './useAutoSave';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useSimplifiedRundownState = () => {
  const { rundownId } = useParams();
  const { user } = useAuth();
  const { 
    savedRundowns, 
    saveRundown, 
    updateRundown, 
    loading: storageLoading 
  } = useRundownStorage();

  // Core state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('00:00:00');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Auto-save state
  const {
    hasUnsavedChanges,
    isSaving,
    isConnected,
    markAsChanged,
    autoSaveEnabled
  } = useAutoSave({
    rundownId: rundownId || '',
    items,
    columns,
    rundownTitle,
    rundownStartTime,
    timezone,
    saveRundown,
    updateRundown,
    user
  });

  // Realtime state
  const { isProcessingRealtimeUpdate } = useRealtimeRundown(
    rundownId || '',
    setItems,
    setColumns,
    setRundownTitle,
    setRundownStartTime,
    setTimezone,
    user?.id || ''
  );

  // Playback controls
  const {
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    showcallerActivity,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(rundownId || '', items);

  // Calculations
  const {
    totalRuntime,
    currentTime,
    getRowNumber,
    getHeaderDuration
  } = useRundownCalculations(items, rundownStartTime, timezone);

  // Undo functionality
  const {
    undo,
    canUndo,
    lastAction,
    pushToHistory
  } = useStandaloneUndo();

  // Load rundown data
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId || rundownId === 'new') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const rundown = savedRundowns.find(r => r.id === rundownId);
        if (rundown) {
          console.log('📊 Loading rundown with columns:', rundown.columns?.length || 0);
          setItems(rundown.items || []);
          setColumns(rundown.columns || []);
          setRundownTitle(rundown.title || 'Untitled Rundown');
          setRundownStartTime(rundown.start_time || '00:00:00');
          setTimezone(rundown.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      } catch (error) {
        console.error('Error loading rundown:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!storageLoading) {
      loadRundown();
    }
  }, [rundownId, savedRundowns, storageLoading]);

  // Item operations
  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    markAsChanged();
    pushToHistory(`Update ${field}`);
  }, [markAsChanged, pushToHistory]);

  const addItem = useCallback((newItem: RundownItem) => {
    setItems(prev => [...prev, newItem]);
    markAsChanged();
    pushToHistory('Add item');
  }, [markAsChanged, pushToHistory]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    markAsChanged();
    pushToHistory('Delete row');
  }, [markAsChanged, pushToHistory]);

  const toggleFloat = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFloating: !item.isFloating } : item
    ));
    markAsChanged();
    pushToHistory('Toggle float');
  }, [markAsChanged, pushToHistory]);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
    markAsChanged();
    pushToHistory(`Delete ${ids.length} items`);
  }, [markAsChanged, pushToHistory]);

  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    setItems(prev => [...prev, newItem]);
    markAsChanged();
    pushToHistory('Add row');
  }, [markAsChanged, pushToHistory]);

  const addHeader = useCallback(() => {
    const newHeader: RundownItem = {
      id: `header_${Date.now()}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    setItems(prev => [...prev, newHeader]);
    markAsChanged();
    pushToHistory('Add header');
  }, [markAsChanged, pushToHistory]);

  const addRowAtIndex = useCallback((insertIndex: number) => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(insertIndex, 0, newItem);
      return newItems;
    });
    markAsChanged();
    pushToHistory('Add row at index');
  }, [markAsChanged, pushToHistory]);

  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    const newHeader: RundownItem = {
      id: `header_${Date.now()}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(insertIndex, 0, newHeader);
      return newItems;
    });
    markAsChanged();
    pushToHistory('Add header at index');
  }, [markAsChanged, pushToHistory]);

  // Column operations
  const addColumn = useCallback((name: string) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: name.toLowerCase().replace(/\s+/g, '_'),
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    setColumns(prev => {
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn); // Insert after segment name
      return newColumns;
    });
    markAsChanged();
    pushToHistory('Add column');
  }, [markAsChanged, pushToHistory]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, width: `${width}px` } : col
    ));
    markAsChanged();
  }, [markAsChanged]);

  // Selection handlers
  const handleRowSelection = useCallback((id: string) => {
    setSelectedRowId(id);
  }, []);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Title and time handlers
  const setTitle = useCallback((title: string) => {
    setRundownTitle(title);
    markAsChanged();
    pushToHistory('Update title');
  }, [markAsChanged, pushToHistory]);

  const setStartTime = useCallback((time: string) => {
    setRundownStartTime(time);
    markAsChanged();
    pushToHistory('Update start time');
  }, [markAsChanged, pushToHistory]);

  const setTimezone = useCallback((tz: string) => {
    setTimezone(tz);
    markAsChanged();
    pushToHistory('Update timezone');
  }, [markAsChanged, pushToHistory]);

  // Get visible columns
  const visibleColumns = columns.filter(col => col.isVisible !== false);

  return {
    // Core data
    items,
    columns,
    visibleColumns,
    rundownTitle,
    rundownStartTime,
    timezone,
    currentTime,
    rundownId,
    
    // State flags
    isLoading,
    hasUnsavedChanges,
    isSaving,
    isConnected,
    isProcessingRealtimeUpdate,
    
    // Playback state
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    showcallerActivity,
    
    // Selection state
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    // Calculations
    totalRuntime,
    getRowNumber,
    getHeaderDuration,
    
    // Core actions
    setItems,
    setColumns,
    updateItem,
    deleteRow,
    toggleFloat,
    deleteMultipleItems,
    addItem,
    setTitle,
    setStartTime,
    setTimezone,
    addRow,
    addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    
    // Column management
    addColumn,
    updateColumnWidth,
    
    // Playback controls
    play,
    pause,
    forward,
    backward,
    
    // Undo functionality
    undo,
    canUndo,
    lastAction
  };
};
