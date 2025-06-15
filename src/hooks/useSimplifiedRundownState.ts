import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { usePlaybackControls } from './usePlaybackControls';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { supabase } from '@/lib/supabase';
import { Column } from './useColumnsManager';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id === 'new' ? null : params.id || null;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  
  // Realtime state - these won't interfere with core functionality
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Typing session tracking
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize with default data (WITHOUT columns - they're now user-specific)
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: [], // Empty - will be managed separately
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York'
  });

  // User-specific column preferences (separate from team sync)
  const {
    columns,
    setColumns,
    isLoading: isLoadingColumns,
    isSaving: isSavingColumns
  } = useUserColumnPreferences(rundownId);

  // Auto-save functionality - now EXCLUDES columns from sync
  const { isSaving, setUndoActive } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    actions.markSaved
  );

  // Standalone undo system with proper change trigger - unchanged
  const { saveState: saveUndoState, undo, canUndo, lastAction } = useStandaloneUndo({
    onUndo: (items, _, title) => { // Note: columns parameter ignored since they're user-specific
      // Set undo active to prevent auto-save interference
      setUndoActive(true);
      
      // Apply undo state using existing actions (items and title only)
      actions.setItems(items);
      actions.setTitle(title);
      
      // Mark as changed and trigger auto-save after undo
      setTimeout(() => {
        // Force a change to trigger auto-save
        actions.markSaved(); // Clear the saved state first
        actions.setItems([...items]); // Trigger change detection
        setUndoActive(false);
      }, 100);
    },
    setUndoActive
  });

  // Realtime rundown updates - now EXCLUDES columns from sync
  const realtimeRundown = useRealtimeRundown({
    rundownId,
    onRundownUpdated: useCallback((updatedRundown) => {
      // Only update if we're not currently saving to avoid conflicts
      if (!isSaving) {
        // Load state WITHOUT columns (they're user-specific)
        actions.loadState({
          items: updatedRundown.items || [],
          columns: [], // Don't sync columns
          title: updatedRundown.title || 'Untitled Rundown',
          startTime: updatedRundown.start_time || '09:00:00',
          timezone: updatedRundown.timezone || 'America/New_York'
        });
      }
    }, [actions, isSaving]),
    hasUnsavedChanges: state.hasUnsavedChanges,
    isProcessingUpdate: isProcessingRealtimeUpdate,
    setIsProcessingUpdate: setIsProcessingRealtimeUpdate
  });

  // Stable realtime collaboration - unchanged
  const stableRealtime = useStableRealtimeCollaboration({
    rundownId,
    onRemoteUpdate: useCallback(() => {
      // This is just for notifications, doesn't change core functionality
    }, []),
    enabled: !!rundownId
  });

  // Update connection status based on realtime hooks
  useEffect(() => {
    setIsConnected(realtimeRundown.isConnected || stableRealtime.isConnected);
  }, [realtimeRundown.isConnected, stableRealtime.isConnected]);

  // Enhanced updateItem function - save undo state with content only (not columns)
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field.startsWith('customFields.') || field === 'segmentName';
    
    if (isTypingField) {
      const sessionKey = `${id}-${field}`;
      
      // If this is the start of a new typing session, save undo state
      if (!typingSessionRef.current || typingSessionRef.current.fieldKey !== sessionKey) {
        // Save undo with content only (no columns)
        saveUndoState(state.items, [], state.title, `Edit ${field}`);
        typingSessionRef.current = {
          fieldKey: sessionKey,
          startTime: Date.now()
        };
      }
      
      // Clear existing timeout and set new one to end typing session
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        typingSessionRef.current = null;
      }, 1000);
    } else if (field === 'duration') {
      // For duration changes, save immediately since they're usually intentional
      saveUndoState(state.items, [], state.title, 'Edit duration');
    }
    
    if (field.startsWith('customFields.')) {
      const customFieldKey = field.replace('customFields.', '');
      const item = state.items.find(i => i.id === id);
      if (item) {
        const currentCustomFields = item.customFields || {};
        actions.updateItem(id, {
          customFields: {
            ...currentCustomFields,
            [customFieldKey]: value
          }
        });
      }
    } else {
      // Map field names to proper item properties
      let updateField = field;
      if (field === 'segmentName') updateField = 'name';
      
      actions.updateItem(id, { [updateField]: value });
    }
  }, [actions.updateItem, state.items, state.title, saveUndoState]);

  // Initialize playbook controls with showcaller functionality - unchanged
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController
  } = usePlaybackControls(
    state.items,
    enhancedUpdateItem,
    rundownId,
    setShowcallerActivity
  );

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data if we have an ID (content only, columns loaded separately)
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId || isInitialized) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('Error loading rundown:', error);
        } else if (data) {
          const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
            ? data.items 
            : createDefaultRundownItems();

          // Load content only (columns loaded separately by useUserColumnPreferences)
          actions.loadState({
            items: itemsToLoad,
            columns: [], // Don't load columns from rundown
            title: data.title || 'Untitled Rundown',
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'America/New_York'
          });
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
        actions.loadState({
          items: createDefaultRundownItems(),
          columns: [], // Don't load columns from rundown
          title: 'Untitled Rundown',
          startTime: '09:00:00',
          timezone: 'America/New_York'
        });
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadRundown();
  }, [rundownId, isInitialized, actions]);

  useEffect(() => {
    if (!rundownId && !isInitialized) {
      actions.loadState({
        items: createDefaultRundownItems(),
        columns: [], // Don't load columns from rundown
        title: 'Untitled Rundown',
        startTime: '09:00:00',
        timezone: 'America/New_York'
      });
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [rundownId, isInitialized, actions]);

  // Calculate all derived values using pure functions - unchanged
  const calculatedItems = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) {
      return [];
    }
    
    const calculated = calculateItemsWithTiming(state.items, state.startTime);
    return calculated;
  }, [state.items, state.startTime]);

  const totalRuntime = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) return '00:00:00';
    return calculateTotalRuntime(state.items);
  }, [state.items]);

  // Enhanced actions with undo state saving (content only)
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: enhancedUpdateItem,

    toggleFloatRow: useCallback((id: string) => {
      saveUndoState(state.items, [], state.title, 'Toggle float');
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items, state.title, saveUndoState]),

    deleteRow: useCallback((id: string) => {
      saveUndoState(state.items, [], state.title, 'Delete row');
      actions.deleteItem(id);
    }, [actions.deleteItem, state.items, state.title, saveUndoState]),

    addRow: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add segment');
      helpers.addRow();
    }, [helpers.addRow, state.items, state.title, saveUndoState]),

    addHeader: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add header');
      helpers.addHeader();
    }, [helpers.addHeader, state.items, state.title, saveUndoState]),

    setTitle: useCallback((newTitle: string) => {
      if (state.title !== newTitle) {
        saveUndoState(state.items, [], state.title, 'Change title');
        actions.setTitle(newTitle);
      }
    }, [actions.setTitle, state.items, state.title, saveUndoState])
  };

  // Get visible columns from user preferences
  const visibleColumns = useMemo(() => {
    if (!columns || !Array.isArray(columns)) {
      return [];
    }
    
    const visible = columns.filter(col => col.isVisible !== false);
    return visible;
  }, [columns]);

  const getHeaderDuration = useCallback((index: number) => {
    if (index === -1 || !state.items || index >= state.items.length) return '00:00:00';
    return calculateHeaderDuration(state.items, index);
  }, [state.items]);

  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= calculatedItems.length) return '';
    return calculatedItems[index].calculatedRowNumber;
  }, [calculatedItems]);

  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(prev => {
      const newSelection = prev === itemId ? null : itemId;
      return newSelection;
    });
  }, [selectedRowId]);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Fixed addRowAtIndex that properly inserts at specified index
  const addRowAtIndex = useCallback((insertIndex: number) => {
    console.log('🚀 SimplifiedState addRowAtIndex called with index:', insertIndex);
    saveUndoState(state.items, [], state.title, 'Add segment');
    
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular' as const,
      rowNumber: '',
      name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
      startTime: '00:00:00',
      duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION,
      endTime: '00:30:00',
      elapsedTime: '00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    // Insert at specific index
    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newItem);
    
    console.log('🚀 Inserting new segment at index:', actualIndex, 'total items will be:', newItems.length);
    actions.setItems(newItems);
  }, [state.items, state.title, saveUndoState, actions.setItems]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    console.log('🚀 SimplifiedState addHeaderAtIndex called with index:', insertIndex);
    saveUndoState(state.items, [], state.title, 'Add header');
    
    const newHeader = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header' as const,
      rowNumber: 'A',
      name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
      startTime: '',
      duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    // Insert at specific index
    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newHeader);
    
    console.log('🚀 Inserting new header at index:', actualIndex, 'total items will be:', newItems.length);
    actions.setItems(newItems);
  }, [state.items, state.title, saveUndoState, actions.setItems]);

  // Clean up timeouts on unmount - unchanged
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Core state with calculated values
    items: calculatedItems,
    setItems: actions.setItems,
    columns, // Now from user preferences
    setColumns, // Now saves to user preferences
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    currentSegmentId,
    isPlaying,
    
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    currentTime,
    rundownId,
    isLoading: isLoading || isLoadingColumns,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: isSaving || isSavingColumns,
    showcallerActivity,
    
    // Realtime connection status
    isConnected,
    isProcessingRealtimeUpdate,
    
    // Playback controls - properly expose these functions with correct signatures
    play: (selectedSegmentId?: string) => {
      play(selectedSegmentId);
    },
    pause: () => {
      pause();
    },
    forward: () => {
      forward();
    },
    backward: () => {
      backward();
    },
    isController,
    timeRemaining,
    
    // Calculations
    totalRuntime,
    getRowNumber,
    getHeaderDuration: (id: string) => {
      const itemIndex = state.items.findIndex(item => item.id === id);
      return getHeaderDuration(itemIndex);
    },
    
    updateItem: enhancedActions.updateItem,
    deleteItem: enhancedActions.deleteRow,
    deleteRow: enhancedActions.deleteRow,
    toggleFloat: enhancedActions.toggleFloatRow,
    deleteMultipleItems: actions.deleteMultipleItems,
    addItem: actions.addItem,
    setTitle: enhancedActions.setTitle,
    setStartTime: actions.setStartTime,
    setTimezone: actions.setTimezone,
    
    addRow: enhancedActions.addRow,
    addHeader: enhancedActions.addHeader,
    addRowAtIndex,
    addHeaderAtIndex,
    
    addColumn: (column: Column) => {
      saveUndoState(state.items, [], state.title, 'Add column');
      setColumns([...columns, column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      const newColumns = columns.map(col =>
        col.id === columnId ? { ...col, width } : col
      );
      setColumns(newColumns);
    },

    // Undo functionality - properly expose these
    undo,
    canUndo,
    lastAction
  };
};
