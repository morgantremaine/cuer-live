
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
  const [timezoneState, setTimezoneState] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Auto-save state
  const {
    hasUnsavedChanges,
    isSaving,
    markAsChanged
  } = useAutoSave(
    items,
    rundownTitle,
    columns,
    timezoneState,
    rundownStartTime
  );

  // Realtime state
  const { 
    isConnected,
    trackOwnUpdate,
    setEditingState
  } = useRealtimeRundown(
    rundownId || '',
    setItems,
    setColumns,
    setRundownTitle,
    setRundownStartTime,
    setTimezoneState,
    user?.id || ''
  );

  // Playback controls
  const {
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(rundownId || '', items);

  // Calculations
  const {
    getRowNumber,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownCalculations(items, rundownStartTime, timezoneState);

  // Undo functionality
  const {
    undo,
    canUndo,
    lastAction,
    saveState
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
          setTimezoneState(rundown.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
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
    saveState(items, columns, rundownTitle, `Update ${field}`);
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  const addItem = useCallback((newItem: RundownItem) => {
    setItems(prev => [...prev, newItem]);
    markAsChanged();
    saveState(items, columns, rundownTitle, 'Add item');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    markAsChanged();
    saveState(items, columns, rundownTitle, 'Delete row');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  const toggleFloat = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFloating: !item.isFloating } : item
    ));
    markAsChanged();
    saveState(items, columns, rundownTitle, 'Toggle float');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
    markAsChanged();
    saveState(items, columns, rundownTitle, `Delete ${ids.length} items`);
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, rundownTitle, 'Add row');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, rundownTitle, 'Add header');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, rundownTitle, 'Add row at index');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, rundownTitle, 'Add header at index');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, rundownTitle, 'Add column');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

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
    saveState(items, columns, title, 'Update title');
  }, [markAsChanged, saveState, items, columns]);

  const setStartTime = useCallback((time: string) => {
    setRundownStartTime(time);
    markAsChanged();
    saveState(items, columns, rundownTitle, 'Update start time');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    markAsChanged();
    saveState(items, columns, rundownTitle, 'Update timezone');
  }, [markAsChanged, saveState, items, columns, rundownTitle]);

  // Get visible columns
  const visibleColumns = columns.filter(col => col.isVisible !== false);

  // Calculate current time and total runtime
  const currentTime = new Date();
  const totalRuntime = calculateTotalRuntime();

  return {
    // Core data
    items,
    columns,
    visibleColumns,
    rundownTitle,
    rundownStartTime,
    timezone: timezoneState,
    currentTime,
    rundownId,
    
    // State flags
    isLoading,
    hasUnsavedChanges,
    isSaving,
    isConnected,
    isProcessingRealtimeUpdate: false, // Default value since not available from realtime hook
    
    // Playback state
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    showcallerActivity: false, // Default value since not available from playback hook
    
    // Selection state
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    // Calculations
    totalRuntime,
    getRowNumber,
    getHeaderDuration: (id: string) => {
      const index = items.findIndex(item => item.id === id);
      return index >= 0 ? calculateHeaderDuration(index) : '00:00:00';
    },
    
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
