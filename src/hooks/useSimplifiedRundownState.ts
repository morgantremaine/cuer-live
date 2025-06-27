
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/interfaces';
import { useRundownStorage } from './useRundownStorage';
import { useAutoSave } from './useAutoSave';
import { useChangeTracking } from './useChangeTracking';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';
import { calculateTotalRuntime, calculateEndTime } from '@/utils/rundownCalculations';

export const useSimplifiedRundownState = () => {
  const { id } = useParams<{ id: string }>();
  const rundownId = id || null;
  const { toast } = useToast();

  // Core state
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('12:00:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  // Processing states
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);

  // Storage and change tracking
  const storage = useRundownStorage();
  const changeTracking = useChangeTracking();
  const isInitialLoadRef = useRef(true);

  // Undo/Redo state - fix the hook usage
  const undoSystem = useStandaloneUndo();

  // Autosave
  useAutoSave({
    data: { items, columns, rundownTitle, rundownStartTime, timezone },
    enabled: !isInitialLoadRef.current && !!rundownId && !isProcessingRealtimeUpdate,
    isSaving,
    hasUnsavedChanges,
    onChange: (hasChanges) => setHasUnsavedChanges(hasChanges),
    onSave: async (data) => {
      if (!rundownId) {
        logger.warn('Cannot save rundown - no rundown ID');
        return false;
      }
      
      setIsSaving(true);
      try {
        await storage.saveRundown({
          id: rundownId,
          title: data.rundownTitle,
          items: data.items,
          columns: data.columns,
          start_time: data.rundownStartTime,
          timezone: data.timezone,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: '',
          archived: false,
          folder_id: null
        });
        changeTracking.markAsSaved(data.items, data.rundownTitle, data.columns, data.timezone, data.rundownStartTime);
        return true;
      } catch (error) {
        logger.error('Autosave failed:', error);
        toast({
          variant: 'destructive',
          title: 'Autosave Failed',
          description: 'There was an error while autosaving your rundown. Please check your internet connection and try again.'
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    }
  });

  // Load rundown on mount
  useEffect(() => {
    if (!rundownId) {
      setIsLoading(false);
      return;
    }

    const loadRundown = async () => {
      setIsLoading(true);
      try {
        // Use the correct method name from storage
        const savedRundowns = await storage.loadRundowns();
        const data = savedRundowns.find(r => r.id === rundownId);
        if (data) {
          setItems(data.items);
          setColumns(data.columns);
          setRundownTitle(data.title);
          setRundownStartTime(data.start_time);
          setTimezone(data.timezone);
          changeTracking.markAsSaved(data.items, data.title, data.columns, data.timezone, data.start_time);
        }
      } catch (error) {
        logger.error('Error loading rundown:', error);
        toast({
          variant: 'destructive',
          title: 'Load Rundown Failed',
          description: 'There was an error while loading your rundown. Please check your internet connection and try again.'
        });
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadRundown();
  }, [rundownId, storage, toast, changeTracking]);

  // Realtime update handler
  const handleRealtimeUpdate = useCallback((updatedRundown: any) => {
    if (updatedRundown) {
      setItems(updatedRundown.items || []);
      setColumns(updatedRundown.columns || []);
      setRundownTitle(updatedRundown.title || 'Untitled Rundown');
      setRundownStartTime(updatedRundown.start_time || '12:00:00');
      setTimezone(updatedRundown.timezone || 'America/New_York');
      
      // Reset change tracking after applying remote update
      changeTracking.markAsSaved(
        updatedRundown.items || [],
        updatedRundown.title || 'Untitled Rundown',
        updatedRundown.columns || [],
        updatedRundown.timezone || 'America/New_York',
        updatedRundown.start_time || '12:00:00'
      );
    }
  }, [changeTracking]);

  // Core data update functions
  const updateItem = useCallback((id: string, field: string, value: any) => {
    setItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          return updatedItem;
        }
        return item;
      });
      return updatedItems;
    });
  }, []);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const toggleFloat = useCallback((id: string) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === id) {
          return { ...item, isFloating: !item.isFloating };
        }
        return item;
      });
    });
  }, []);

  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prevItems => prevItems.filter(item => !ids.includes(item.id)));
  }, []);

  const addItem = useCallback((item: RundownItem) => {
    setItems(prevItems => [...prevItems, item]);
  }, []);

  const setTitle = useCallback((title: string) => {
    setRundownTitle(title);
  }, []);

  const setStartTime = useCallback((startTime: string) => {
    setRundownStartTime(startTime);
  }, []);

  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular',
      rowNumber: '',
      name: 'New Item',
      duration: '00:01',
      startTime: '00:00:00',
      endTime: '00:01:00',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false
    };
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

  const addHeader = useCallback(() => {
    const newHeader: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false
    };
    setItems(prevItems => [...prevItems, newHeader]);
  }, []);

  const addRowAtIndex = useCallback((insertIndex: number) => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular',
      rowNumber: '',
      name: 'New Item',
      duration: '00:01',
      startTime: '00:00:00',
      endTime: '00:01:00',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false
    };
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems.splice(insertIndex, 0, newItem);
      return newItems;
    });
  }, []);

  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    const newHeader: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false
    };
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems.splice(insertIndex, 0, newHeader);
      return newItems;
    });
  }, []);

  const addColumn = useCallback((column: Column) => {
    setColumns(prevColumns => [...prevColumns, column]);
  }, []);

  const updateColumnWidth = useCallback((id: string, width: number) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        if (column.id === id) {
          return { ...column, width };
        }
        return column;
      });
    });
  }, []);

  const realtimeCollaboration = useRealtimeRundown({
    rundownId,
    onRundownUpdate: handleRealtimeUpdate,
    enabled: !!rundownId,
    currentContentHash: JSON.stringify({ items, rundownTitle, rundownStartTime, timezone }),
    isEditing: hasUnsavedChanges,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate: (timestamp: string) => {
      logger.log('🔄 Tracking own update:', timestamp);
    },
    onProcessingStateChange: (isProcessing: boolean) => {
      setIsProcessingRealtimeUpdate(isProcessing);
    }
  });

  return {
    items,
    columns,
    visibleColumns: columns.filter(col => col.visible !== false),
    rundownTitle,
    rundownStartTime,
    timezone,
    currentTime,
    rundownId,
    
    // State flags
    isLoading,
    hasUnsavedChanges,
    isSaving,
    isConnected: realtimeCollaboration.isConnected,
    isProcessingRealtimeUpdate,
    
    // Selection state
    selectedRowId,
    handleRowSelection: setSelectedRowId,
    clearRowSelection: () => setSelectedRowId(null),
    
    // Calculations - fix getRowNumber to match expected signature
    totalRuntime: calculateTotalRuntime(items),
    getRowNumber: (index: number) => {
      return (index + 1).toString();
    },
    getHeaderDuration: (headerId: string) => {
      const headerIndex = items.findIndex(item => item.id === headerId);
      if (headerIndex === -1 || items[headerIndex].type !== 'header') return '00:00:00';
      
      let totalSeconds = 0;
      for (let i = headerIndex + 1; i < items.length; i++) {
        const item = items[i];
        if (item.type === 'header') break;
        if (!item.isFloating && !item.isFloated && item.duration) {
          const [minutes, seconds] = item.duration.split(':').map(Number);
          totalSeconds += (minutes * 60) + (seconds || 0);
        }
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const remainingSeconds = totalSeconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
    
    // Core actions
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
    setItems,
    
    // Column management
    addColumn,
    updateColumnWidth,
    setColumns,
    
    // Undo functionality - use the actual available methods
    undo: undoSystem.undo,
    canUndo: undoSystem.canUndo,
    lastAction: undoSystem.lastAction
  };
};
