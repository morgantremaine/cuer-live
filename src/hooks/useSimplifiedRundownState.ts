import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { usePlaybackControls } from './usePlaybackControls';
import { useStandaloneUndo } from './useStandaloneUndo';
import { supabase } from '@/lib/supabase';
import { Column } from './useColumnsManager';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';

// Default columns configuration
const defaultColumns: Column[] = [
  { id: 'segmentName', name: 'Segment', key: 'segmentName', isVisible: true, width: '200px', isCustom: false, isEditable: true },
  { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: '100px', isCustom: false, isEditable: true },
  { id: 'startTime', name: 'Start', key: 'startTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
  { id: 'endTime', name: 'End', key: 'endTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
  { id: 'talent', name: 'Talent', key: 'talent', isVisible: true, width: '150px', isCustom: false, isEditable: true },
  { id: 'script', name: 'Script', key: 'script', isVisible: true, width: '300px', isCustom: false, isEditable: true }
];

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id === 'new' ? null : params.id || null;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);

  // Typing session tracking with improved logic
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingSessionRef = useRef<string | null>(null);

  // Initialize with default data
  const {
    state,
    actions,
    helpers
  } = useRundownState({
    items: [],
    columns: defaultColumns,
    title: 'Untitled Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York'
  });

  // Auto-save functionality with typing session support
  const { isSaving, setUndoActive, setTypingSession } = useSimpleAutoSave(state, rundownId, actions.markSaved);

  // Standalone undo system with proper change trigger
  const { saveState: saveUndoState, undo, canUndo, lastAction } = useStandaloneUndo({
    onUndo: (items, columns, title) => {
      console.log('🔄 Applying undo state:', { itemsCount: items.length, columnsCount: columns.length, title });
      
      // Set undo active to prevent auto-save interference
      setUndoActive(true);
      
      // Apply undo state using existing actions
      actions.setItems(items);
      actions.setColumns(columns);
      actions.setTitle(title);
      
      // Mark as changed and trigger auto-save after undo
      setTimeout(() => {
        setUndoActive(false);
        console.log('🔄 Re-enabled auto-save after undo');
      }, 1000);
    },
    setUndoActive
  });

  // Enhanced updateItem function that works with showcaller and saves undo state with proper typing session management
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    console.log('📺 Enhanced updateItem called:', { id, field, value });
    
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field.startsWith('customFields.') || field === 'segmentName';
    
    if (isTypingField) {
      const sessionKey = `${id}-${field}`;
      
      // Clear any existing typing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Check if this is the start of a new typing session
      if (!setTypingSession || typeof setTypingSession !== 'function') {
        console.warn('setTypingSession not available');
      } else {
        // Save undo state only at the start of a typing session
        const existingTypingSession = typingSessionRef.current !== null;
        if (!existingTypingSession) {
          console.log('💾 Saving undo state before typing session for:', sessionKey);
          saveUndoState(state.items, state.columns, state.title, `Edit ${field}`);
        }
        
        // Start/continue typing session
        setTypingSession(sessionKey);
        typingSessionRef.current = sessionKey;
        
        // Update the item immediately
        actuallyUpdateItem(id, field, value);
        
        // Set timeout to end typing session after user stops typing
        typingTimeoutRef.current = setTimeout(() => {
          console.log('💾 Typing session ended for:', sessionKey);
          setTypingSession(null);
          typingSessionRef.current = null;
          typingTimeoutRef.current = undefined;
          
          // Trigger auto-save after typing session ends
          actions.markAsChanged();
        }, 1500); // 1.5 seconds of inactivity ends the session
      }
    } else if (field === 'duration') {
      // For duration changes, save immediately since they're usually intentional
      saveUndoState(state.items, state.columns, state.title, 'Edit duration');
      actuallyUpdateItem(id, field, value);
    } else {
      // For non-typing fields, update immediately
      actuallyUpdateItem(id, field, value);
    }
  }, [state.items, state.columns, state.title, saveUndoState, setTypingSession, actions.markAsChanged]);

  const actuallyUpdateItem = useCallback((id: string, field: string, value: string) => {
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
  }, [actions.updateItem, state.items]);

  // Initialize playback controls with showcaller functionality
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

  // Load rundown data if we have an ID
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
          
          const columnsToLoad = Array.isArray(data.columns) && data.columns.length > 0 
            ? data.columns 
            : defaultColumns;

          actions.loadState({
            items: itemsToLoad,
            columns: columnsToLoad,
            title: data.title || 'Untitled Rundown',
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'America/New_York'
          });
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
        actions.loadState({
          items: createDefaultRundownItems(),
          columns: defaultColumns,
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
        columns: defaultColumns,
        title: 'Untitled Rundown',
        startTime: '09:00:00',
        timezone: 'America/New_York'
      });
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [rundownId, isInitialized, actions]);

  // Calculate all derived values using pure functions
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

  // Enhanced actions with undo state saving - debounce multiple rapid changes
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: enhancedUpdateItem,

    toggleFloatRow: useCallback((id: string) => {
      saveUndoState(state.items, state.columns, state.title, 'Toggle float');
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items, state.columns, state.title, saveUndoState]),

    deleteRow: useCallback((id: string) => {
      saveUndoState(state.items, state.columns, state.title, 'Delete row');
      actions.deleteItem(id);
    }, [actions.deleteItem, state.items, state.columns, state.title, saveUndoState]),

    addRow: useCallback(() => {
      saveUndoState(state.items, state.columns, state.title, 'Add segment');
      helpers.addRow();
    }, [helpers.addRow, state.items, state.columns, state.title, saveUndoState]),

    addHeader: useCallback(() => {
      saveUndoState(state.items, state.columns, state.title, 'Add header');
      helpers.addHeader();
    }, [helpers.addHeader, state.items, state.columns, state.title, saveUndoState]),

    setTitle: useCallback((newTitle: string) => {
      if (state.title !== newTitle) {
        saveUndoState(state.items, state.columns, state.title, 'Change title');
        actions.setTitle(newTitle);
      }
    }, [actions.setTitle, state.items, state.columns, state.title, saveUndoState])
  };

  // Get visible columns - ensure they actually exist and are marked visible
  const visibleColumns = useMemo(() => {
    if (!state.columns || !Array.isArray(state.columns)) {
      return defaultColumns.filter(col => col.isVisible !== false);
    }
    
    const visible = state.columns.filter(col => col.isVisible !== false);
    return visible;
  }, [state.columns]);

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

  const addRowAtIndex = useCallback((insertIndex: number) => {
    saveUndoState(state.items, state.columns, state.title, 'Add segment');
    if (helpers.addRow && typeof helpers.addRow === 'function') {
      helpers.addRow(insertIndex);
    } else {
      helpers.addRow();
    }
  }, [helpers, state.items, state.columns, state.title, saveUndoState]);

  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    saveUndoState(state.items, state.columns, state.title, 'Add header');
    if (helpers.addHeader && typeof helpers.addHeader === 'function') {
      helpers.addHeader(insertIndex);
    } else {
      helpers.addHeader();
    }
  }, [helpers, state.items, state.columns, state.title, saveUndoState]);

  // Clean up timeouts on unmount
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
    columns: state.columns || defaultColumns,
    setColumns: actions.setColumns,
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
    isLoading,
    hasUnsavedChanges: state.hasUnsavedChanges && !isSaving,
    isSaving,
    showcallerActivity,
    
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
      saveUndoState(state.items, state.columns, state.title, 'Add column');
      actions.setColumns([...(state.columns || defaultColumns), column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      actions.updateColumn(columnId, { width });
    },

    // Undo functionality - properly expose these
    undo,
    canUndo,
    lastAction
  };
};
