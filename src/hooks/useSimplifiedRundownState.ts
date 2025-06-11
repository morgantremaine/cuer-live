
import { useState, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useRundownUndo } from './useRundownUndo';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id && params.id !== 'new' ? params.id : undefined;
  
  // Core state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isController, setIsController] = useState(false);

  // Storage and auto-save
  const { savedRundowns, loading, updateRundown } = useRundownStorage();
  
  // Undo functionality - connect to the actual updateRundown function
  const { saveStateOnSave, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId,
    updateRundown
  });

  // Auto-save with undo integration
  const { hasUnsavedChanges, isSaving } = useSimpleAutoSave(
    rundownId,
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime,
    saveStateOnSave // Pass the undo save function to auto-save
  );

  // Load rundown data
  useEffect(() => {
    if (loading || !rundownId) return;
    
    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (rundown) {
      console.log('📚 Loading rundown data:', rundown.title);
      setItems(rundown.items || []);
      setColumns(rundown.columns || []);
      setRundownTitle(rundown.title || 'Untitled Rundown');
      setTimezone(rundown.timezone || 'America/New_York');
      setRundownStartTime(rundown.start_time || '09:00:00');
      
      // Load undo history
      if (rundown.undo_history && Array.isArray(rundown.undo_history)) {
        console.log('📚 Loading undo history:', rundown.undo_history.length, 'states');
        loadUndoHistory(rundown.undo_history);
      }
    }
  }, [savedRundowns, loading, rundownId, loadUndoHistory]);

  // Enhanced undo handler
  const handleUndo = useCallback(() => {
    if (!canUndo) {
      console.log('❌ Cannot undo - no states available');
      return null;
    }

    console.log('🔄 Executing undo...');
    const result = undo(
      setItems,
      setColumns,
      setRundownTitle
    );

    console.log('✅ Undo completed:', result);
    return result;
  }, [undo, canUndo]);

  const addItem = useCallback((item: RundownItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular', // FIXED: Use correct type
      rowNumber: '',
      name: 'New Segment',
      startTime: '00:00:00',
      duration: '00:02:00',
      endTime: '00:02:00',
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
    addItem(newItem);
  }, [addItem]);

  const addRowAtIndex = useCallback((index: number) => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular', // FIXED: Use correct type
      rowNumber: '',
      name: 'New Segment',
      startTime: '00:00:00',
      duration: '00:02:00',
      endTime: '00:02:00',
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
      newItems.splice(index, 0, newItem);
      return newItems;
    });
  }, []);

  const addHeader = useCallback(() => {
    const headerLetter = String.fromCharCode(65 + items.filter(item => item.type === 'header').length);
    const newHeader: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: headerLetter,
      name: `Header ${headerLetter}`,
      startTime: '00:00:00',
      duration: '00:00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      segmentName: headerLetter,
      customFields: {}
    };
    addItem(newHeader);
  }, [addItem, items]);

  const addHeaderAtIndex = useCallback((index: number) => {
    const headerLetter = String.fromCharCode(65 + items.filter(item => item.type === 'header').length);
    const newHeader: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: headerLetter,
      name: `Header ${headerLetter}`,
      startTime: '00:00:00',
      duration: '00:00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      segmentName: headerLetter,
      customFields: {}
    };
    
    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(index, 0, newHeader);
      return newItems;
    });
  }, [items]);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
  }, []);

  const toggleFloat = useCallback((id: string) => {
    updateItem(id, 'isFloating', 'true');
  }, [updateItem]);

  const addColumn = useCallback((name: string, key: string, columnType: string) => {
    const newColumn: Column = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      key,
      isVisible: true,
      width: '150px'
      // REMOVED: order property as it doesn't exist in Column type
    };
    setColumns(prev => [...prev, newColumn]);
  }, []);

  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, width } : col
    ));
  }, []);

  const getRowNumber = useCallback((index: number) => {
    const item = items[index];
    if (!item) return '';
    
    if (item.type === 'header') {
      return item.segmentName || item.rowNumber || 'A';
    }
    
    return (index + 1).toString();
  }, [items]);

  const getHeaderDuration = useCallback((itemId: string) => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return '00:00:00';
    
    let totalDuration = 0;
    for (let i = itemIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') break;
      if (item.duration) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalDuration += hours * 3600 + minutes * 60 + seconds;
      }
    }
    
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const totalRuntime = useCallback(() => {
    let total = 0;
    items.forEach(item => {
      if (item.type === 'regular' && item.duration) { // FIXED: Use correct type comparison
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        total += hours * 3600 + minutes * 60 + seconds;
      }
    });
    
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [items]);

  const visibleColumns = columns.filter(col => col.isVisible);

  const handleRowSelection = useCallback((rowId: string) => {
    setSelectedRowId(prev => prev === rowId ? null : rowId);
  }, []);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Playback controls
  const play = useCallback((segmentId?: string) => {
    if (segmentId) {
      setCurrentSegmentId(segmentId);
    }
    setIsPlaying(true);
    setIsController(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const forward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentIndex < items.length - 1) {
      setCurrentSegmentId(items[currentIndex + 1].id);
    }
  }, [items, currentSegmentId]);

  const backward = useCallback(() => {
    const currentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentIndex > 0) {
      setCurrentSegmentId(items[currentIndex - 1].id);
    }
  }, [items, currentSegmentId]);

  return {
    // State
    items,
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
    selectedRowId,
    currentSegmentId,
    isPlaying,
    timeRemaining,
    isController,
    rundownId,
    isLoading: loading,
    hasUnsavedChanges,
    isSaving,
    currentTime: new Date(),
    
    // Row operations
    addItem,
    updateItem,
    deleteItem,
    addRow,
    addRowAtIndex,
    addHeader,
    addHeaderAtIndex,
    deleteMultipleItems,
    toggleFloat,
    
    // Column operations
    addColumn,
    updateColumnWidth,
    
    // Selection
    handleRowSelection,
    clearRowSelection,
    
    // Calculations
    getRowNumber,
    getHeaderDuration,
    totalRuntime,
    
    // Playback
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
