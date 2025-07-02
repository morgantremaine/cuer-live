import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useUndo } from './useUndo';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

interface UseSimplifiedRundownStateProps {
  initialRundownId: string | null;
}

export const useSimplifiedRundownState = () => {
  const [rundownId, setRundownId] = useState<string | null>(null);
  const [items, setItems] = useState<RundownItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'name', title: 'Name', width: '200px', visible: true },
    { id: 'duration', title: 'Duration', width: '80px', visible: true },
    { id: 'startTime', title: 'Start Time', width: '80px', visible: true },
    { id: 'endTime', title: 'End Time', width: '80px', visible: true },
    { id: 'talent', title: 'Talent', width: '150px', visible: true },
    { id: 'script', title: 'Script', width: '300px', visible: false },
    { id: 'notes', title: 'Notes', width: '300px', visible: false },
    { id: 'gfx', title: 'GFX', width: '150px', visible: false },
    { id: 'video', title: 'Video', width: '150px', visible: false },
    { id: 'images', title: 'Images', width: '150px', visible: false },
    { id: 'color', title: 'Color', width: '80px', visible: false },
    { id: 'customFields', title: 'Custom Fields', width: '200px', visible: false },
  ]);
  const [visibleColumns, setVisibleColumns] = useState<Column[]>(columns.filter(col => col.visible));
  const [rundownTitle, setRundownTitle] = useState<string>('');
  const [rundownStartTime, setRundownStartTime] = useState<string>('00:00:00');
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
	const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  // Auth hook
  const { user } = useAuth();
  
  // Own update tracking
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());

  // Undo/Redo state
  const {
    state: undoState,
    setState: setUndoState,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction
  } = useUndo<RundownItem[]>({
    initialState: [],
    onChange: () => {
      setHasUnsavedChanges(true);
    }
  });

  // Function to save current state to undo stack
  const saveUndoState = useCallback((action: string) => {
    setUndoState(items, action);
  }, [items, setUndoState]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      // Simulate loading data (replace with actual data fetching)
      setTimeout(() => {
        const initialItems: RundownItem[] = [
          { id: uuidv4(), type: 'segment', name: 'Opening Segment', duration: '00:05', startTime: '00:00:00' },
          { id: uuidv4(), type: 'item', name: 'Intro Music', duration: '00:05', startTime: '00:00:05' },
          { id: uuidv4(), type: 'item', name: 'Host Welcome', duration: '00:10', startTime: '00:00:10' },
          { id: uuidv4(), type: 'segment', name: 'Interview Segment', duration: '00:15', startTime: '00:00:20' },
          { id: uuidv4(), type: 'item', name: 'Guest Intro', duration: '00:05', startTime: '00:00:25' },
          { id: uuidv4(), type: 'item', name: 'Interview Questions', duration: '00:10', startTime: '00:00:30' },
          { id: uuidv4(), type: 'segment', name: 'Closing Segment', duration: '00:05', startTime: '00:00:40' },
          { id: uuidv4(), type: 'item', name: 'Thank You', duration: '00:05', startTime: '00:00:45' },
        ];
        
        setItems(initialItems);
        setUndoState(initialItems, 'Initial data load');
        setIsLoading(false);
      }, 500);
    };
    
    loadInitialData();
  }, [setUndoState]);

  // Realtime collaboration with content processing state
  const realtimeHook = useRealtimeRundown({
    rundownId,
    onRundownUpdate: handleRealtimeUpdate,
    enabled: true,
    currentContentHash: JSON.stringify({
      items: items || [],
      title: rundownTitle || '',
      start_time: rundownStartTime || '',
      timezone: timezone || ''
    }),
    isEditing: false,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate: false,
    trackOwnUpdate: (timestamp: string) => {
      ownUpdateTrackingRef.current.add(timestamp);
      setTimeout(() => {
        ownUpdateTrackingRef.current.delete(timestamp);
      }, 10000);
    }
  });

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((updatedRundown: any) => {
    if (updatedRundown) {
      setItems(updatedRundown.items || []);
      setRundownTitle(updatedRundown.title || '');
      setRundownStartTime(updatedRundown.start_time || '00:00:00');
      setTimezone(updatedRundown.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setHasUnsavedChanges(false);
    }
  }, []);

  // Update visible columns
  useEffect(() => {
    setVisibleColumns(columns.filter(col => col.visible));
  }, [columns]);

  // Function to add a new item
  const addItem = useCallback((newItem: RundownItem, insertIndex?: number) => {
    const newItemWithId = { ...newItem, id: uuidv4() };
    
    setItems(prevItems => {
      const newItems = insertIndex !== undefined
        ? [...prevItems.slice(0, insertIndex), newItemWithId, ...prevItems.slice(insertIndex)]
        : [...prevItems, newItemWithId];
      
      saveUndoState('Add item');
      setHasUnsavedChanges(true);
      return newItems;
    });
  }, [saveUndoState]);

  // Function to update an item
  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      );
      
      saveUndoState(`Update ${field}`);
      setHasUnsavedChanges(true);
      return newItems;
    });
  }, [saveUndoState]);

  // Function to delete an item
  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== id);
      
      saveUndoState('Delete item');
      setHasUnsavedChanges(true);
      return newItems;
    });
		setSelectedRowId(null);
  }, [saveUndoState]);

  // Function to toggle float state
  const toggleFloat = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      );
      
      saveUndoState('Toggle float');
      setHasUnsavedChanges(true);
      return newItems;
    });
  }, [saveUndoState]);

  // Function to delete multiple items
  const deleteMultipleItems = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => !ids.includes(item.id));
      
      saveUndoState('Delete multiple items');
      setHasUnsavedChanges(true);
      return newItems;
    });
		setSelectedRowId(null);
  }, [saveUndoState]);

  // Function to add a new row
  const addRow = useCallback(() => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'item',
      name: 'New Item',
      duration: '00:00',
      startTime: '00:00:00'
    };
    
    setItems(prevItems => [...prevItems, newItem]);
    saveUndoState('Add row');
    setHasUnsavedChanges(true);
  }, [saveUndoState]);

  // Function to add a new row at a specific index
  const addRowAtIndex = useCallback((insertIndex: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'item',
      name: 'New Item',
      duration: '00:00',
      startTime: '00:00:00'
    };
    
    setItems(prevItems => {
      const newItems = [...prevItems.slice(0, insertIndex), newItem, ...prevItems.slice(insertIndex)];
      saveUndoState('Add row at index');
      setHasUnsavedChanges(true);
      return newItems;
    });
  }, [saveUndoState]);

  // Function to add a new header
  const addHeader = useCallback(() => {
    const newHeader: RundownItem = {
      id: uuidv4(),
      type: 'segment',
      name: 'New Segment',
      duration: '00:00',
      startTime: '00:00:00'
    };
    
    setItems(prevItems => [...prevItems, newHeader]);
    saveUndoState('Add header');
    setHasUnsavedChanges(true);
  }, [saveUndoState]);

  // Function to add a new header at a specific index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    const newHeader: RundownItem = {
      id: uuidv4(),
      type: 'segment',
      name: 'New Segment',
      duration: '00:00',
      startTime: '00:00:00'
    };
    
    setItems(prevItems => {
      const newItems = [...prevItems.slice(0, insertIndex), newHeader, ...prevItems.slice(insertIndex)];
      saveUndoState('Add header at index');
      setHasUnsavedChanges(true);
      return newItems;
    });
  }, [saveUndoState]);

  // Function to add a new column
  const addColumn = useCallback((column: Column) => {
    setColumns(prevColumns => [...prevColumns, column]);
  }, []);

  // Function to update column width
  const updateColumnWidth = useCallback((columnId: string, width: string) => {
    setColumns(prevColumns => {
      return prevColumns.map(column =>
        column.id === columnId ? { ...column, width } : column
      );
    });
  }, []);

	const handleRowSelection = useCallback((itemId: string | null) => {
		setSelectedRowId(itemId);
	}, []);

	const clearRowSelection = useCallback(() => {
		setSelectedRowId(null);
	}, []);

  return {
    rundownId,
    items,
    columns,
    visibleColumns,
    rundownTitle,
    rundownStartTime,
    timezone,
    currentTime,
    isLoading,
    hasUnsavedChanges,
    isSaving,
		selectedRowId,
    
    addItem,
    updateItem,
    deleteRow,
    toggleFloat,
    deleteMultipleItems,
    addRow,
    addHeader,
    addColumn,
    updateColumnWidth,
    setItems,
    setColumns,
    setTitle,
    setStartTime,
    setTimezone,
		handleRowSelection,
		clearRowSelection,
    addRowAtIndex,
    addHeaderAtIndex,
    
    // Undo/Redo functions
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction,
    saveUndoState,
    
    // Connection state - now includes content processing state
    isConnected: realtimeHook.isConnected,
    isProcessingRealtimeUpdate: realtimeHook.isProcessingContentUpdate, // Use content processing state
  };
};
