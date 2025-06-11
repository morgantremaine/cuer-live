
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useRundownStorage } from './useRundownStorage';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useRundownUndo } from './useRundownUndo';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_COLUMNS: Column[] = [
  { id: 'source', name: 'Source', width: '60px', isVisible: true, isCustom: false, key: 'rowNumber', isEditable: false },
  { id: 'segmentName', name: 'Segment Name', width: '200px', isVisible: true, isCustom: false, key: 'name', isEditable: true },
  { id: 'talent', name: 'Talent', width: '120px', isVisible: true, isCustom: false, key: 'talent', isEditable: true },
  { id: 'script', name: 'Script', width: '200px', isVisible: true, isCustom: false, key: 'script', isEditable: true },
  { id: 'gfx', name: 'GFX', width: '120px', isVisible: true, isCustom: false, key: 'gfx', isEditable: true },
  { id: 'video', name: 'Video', width: '120px', isVisible: true, isCustom: false, key: 'video', isEditable: true },
  { id: 'stage', name: 'Stage', width: '80px', isVisible: true, isCustom: false, key: 'notes', isEditable: true },
  { id: 'duration', name: 'Duration', width: '80px', isVisible: true, isCustom: false, key: 'duration', isEditable: true },
  { id: 'startTime', name: 'Start', width: '80px', isVisible: true, isCustom: false, key: 'startTime', isEditable: false },
  { id: 'endTime', name: 'End', width: '80px', isVisible: true, isCustom: false, key: 'endTime', isEditable: false },
  { id: 'elapsedTime', name: 'Elapsed', width: '80px', isVisible: true, isCustom: false, key: 'elapsedTime', isEditable: false },
  { id: 'notes', name: 'Notes', width: '200px', isVisible: true, isCustom: false, key: 'notes', isEditable: true }
];

export const useSimplifiedRundownState = () => {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const rundownId = (!params.id || params.id === 'new' || params.id === ':id' || params.id.trim() === '') ? undefined : params.id;
  const { loadRundowns, savedRundowns, updateRundown } = useRundownStorage();
  
  // Core state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isController, setIsController] = useState(false);
  
  const isInitialized = useRef(false);
  const autoSaveEnabled = useRef(true);
  
  // Auto-save functionality
  const { hasUnsavedChanges, isSaving } = useSimpleAutoSave(
    rundownId,
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime
  );

  // Undo functionality
  const { saveStateOnSave, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId,
    currentTitle: rundownTitle,
    currentItems: items,
    currentColumns: columns
  });

  // Time helper functions
  const timeToSeconds = useCallback((timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }, []);

  const secondsToTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate items with proper timing and row numbers
  const itemsWithCalculations = useMemo(() => {
    let currentTime = rundownStartTime;
    let headerIndex = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return items.map((item, index) => {
      let calculatedStartTime = currentTime;
      let calculatedEndTime = currentTime;
      let rowNumber = '';

      if (isHeaderItem(item)) {
        // Headers get the current timeline position and don't advance time
        calculatedStartTime = currentTime;
        calculatedEndTime = currentTime;
        rowNumber = letters[headerIndex] || 'A';
        headerIndex++;
      } else {
        // Regular items
        calculatedStartTime = currentTime;
        
        if (item.duration) {
          const durationSeconds = timeToSeconds(item.duration);
          const startSeconds = timeToSeconds(currentTime);
          calculatedEndTime = secondsToTime(startSeconds + durationSeconds);
          
          // Only advance timeline if item is not floated
          if (!item.isFloating && !item.isFloated) {
            currentTime = calculatedEndTime;
          }
        } else {
          calculatedEndTime = currentTime;
        }

        // Calculate row number for regular items
        let currentSegment = 'A';
        let itemCountInSegment = 0;

        // Find current segment
        for (let i = 0; i <= index; i++) {
          const currentItem = items[i];
          if (isHeaderItem(currentItem)) {
            let segmentHeaderIndex = 0;
            for (let j = 0; j <= i; j++) {
              if (isHeaderItem(items[j])) {
                segmentHeaderIndex++;
              }
            }
            currentSegment = letters[segmentHeaderIndex - 1] || 'A';
            itemCountInSegment = 0;
          } else {
            itemCountInSegment++;
          }
        }

        rowNumber = `${currentSegment}${itemCountInSegment}`;
      }

      const elapsedSeconds = timeToSeconds(calculatedStartTime) - timeToSeconds(rundownStartTime);
      const calculatedElapsedTime = secondsToTime(Math.max(0, elapsedSeconds));

      return {
        ...item,
        startTime: calculatedStartTime,
        endTime: calculatedEndTime,
        elapsedTime: calculatedElapsedTime,
        rowNumber
      };
    });
  }, [items, rundownStartTime, timeToSeconds, secondsToTime]);

  // Visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.isVisible !== false);
  }, [columns]);

  // Calculate total runtime
  const totalRuntime = useCallback(() => {
    const totalSeconds = items.reduce((acc, item) => {
      if (isHeaderItem(item) || item.isFloating || item.isFloated) return acc;
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);
    return secondsToTime(totalSeconds);
  }, [items, timeToSeconds, secondsToTime]);

  // Get row number for a specific index
  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= itemsWithCalculations.length) return '';
    return itemsWithCalculations[index]?.rowNumber || '';
  }, [itemsWithCalculations]);

  // Get header duration
  const getHeaderDuration = useCallback((headerId: string) => {
    const headerIndex = items.findIndex(item => item.id === headerId);
    if (headerIndex === -1 || !isHeaderItem(items[headerIndex])) {
      return '00:00:00';
    }

    let totalSeconds = 0;
    let i = headerIndex + 1;

    // Sum up durations of non-floated items until next header
    while (i < items.length && !isHeaderItem(items[i])) {
      if (!items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration || '00:00');
      }
      i++;
    }

    return secondsToTime(totalSeconds);
  }, [items, timeToSeconds, secondsToTime]);

  // Load rundown data
  const loadRundown = useCallback(async () => {
    if (!user || !rundownId || isInitialized.current) return;

    try {
      setIsLoading(true);
      await loadRundowns();
      const rundown = savedRundowns.find(r => r.id === rundownId);
      
      if (rundown) {
        setItems(rundown.items || []);
        setColumns(rundown.columns || DEFAULT_COLUMNS);
        setRundownTitle(rundown.title || 'Untitled Rundown');
        setRundownStartTime(rundown.start_time || '09:00:00');
        setTimezone(rundown.timezone || 'America/New_York');
        
        // Load undo history
        if (rundown.undo_history) {
          loadUndoHistory(rundown.undo_history);
        }
        
        isInitialized.current = true;
      }
    } catch (error) {
      console.error('Failed to load rundown:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, rundownId, loadRundowns, savedRundowns, loadUndoHistory]);

  // Initialize data
  useEffect(() => {
    if (user && rundownId && !isInitialized.current) {
      loadRundown();
    }
  }, [user, rundownId, loadRundown]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save state for undo when items change
  useEffect(() => {
    if (isInitialized.current && autoSaveEnabled.current) {
      saveStateOnSave(items, columns, rundownTitle, 'Items updated');
    }
  }, [items, columns, rundownTitle, saveStateOnSave]);

  // Item management functions
  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field.startsWith('customFields.')) {
          const customFieldKey = field.replace('customFields.', '');
          return {
            ...item,
            customFields: {
              ...item.customFields,
              [customFieldKey]: value
            }
          };
        } else {
          return { ...item, [field]: value };
        }
      }
      return item;
    }));
  }, []);

  const addItem = useCallback((item: RundownItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const addRowAtIndex = useCallback((index: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '',
      duration: '00:02:00',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false
    };

    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(index, 0, newItem);
      return newItems;
    });
  }, []);

  const addHeaderAtIndex = useCallback((index: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: 'A',
      name: 'New Header',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false
    };

    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(index, 0, newItem);
      return newItems;
    });
  }, []);

  const addRow = useCallback(() => {
    addRowAtIndex(items.length);
  }, [addRowAtIndex, items.length]);

  const addHeader = useCallback(() => {
    addHeaderAtIndex(items.length);
  }, [addHeaderAtIndex, items.length]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const toggleFloat = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isFloating: !item.isFloating } : item
    ));
  }, []);

  // Column management
  const addColumn = useCallback((name: string) => {
    const newColumn: Column = {
      id: uuidv4(),
      name,
      width: '120px',
      isVisible: true,
      isCustom: true,
      key: name.toLowerCase().replace(/\s+/g, '_'),
      isEditable: true
    };
    setColumns(prev => [...prev, newColumn]);
  }, []);

  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, width } : col
    ));
  }, []);

  // Selection management
  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(prev => prev === itemId ? null : itemId);
  }, []);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Showcaller functions
  const play = useCallback((segmentId?: string) => {
    setIsPlaying(true);
    if (segmentId) {
      setCurrentSegmentId(segmentId);
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const forward = useCallback(() => {
    // Implementation for forward
  }, []);

  const backward = useCallback(() => {
    // Implementation for backward
  }, []);

  // Undo functionality
  const handleUndo = useCallback(() => {
    autoSaveEnabled.current = false;
    const action = undo(setItems, setColumns, setRundownTitle);
    setTimeout(() => {
      autoSaveEnabled.current = true;
    }, 1000);
    return action;
  }, [undo]);

  return {
    // Core state
    items: itemsWithCalculations,
    setItems,
    columns,
    setColumns,
    visibleColumns,
    rundownTitle,
    setTitle: setRundownTitle,
    rundownStartTime,
    setStartTime: setRundownStartTime,
    timezone,
    setTimezone,
    currentTime,
    rundownId,
    isLoading,
    hasUnsavedChanges,
    isSaving,
    
    // Selection state
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    // Showcaller state
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    
    // Item management
    updateItem,
    addItem,
    addRow,
    addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    deleteItem,
    deleteMultipleItems,
    toggleFloat,
    
    // Column management
    addColumn,
    updateColumnWidth,
    
    // Calculations
    getRowNumber,
    getHeaderDuration,
    totalRuntime,
    
    // Showcaller controls
    play,
    pause,
    forward,
    backward,
    
    // Undo functionality
    handleUndo,
    canUndo,
    lastAction
  };
};
