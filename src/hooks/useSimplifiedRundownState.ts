import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useSimpleRealtimeRundown } from './useSimpleRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
import { useEnhancedEditingCoordination } from './useEnhancedEditingCoordination';
import { useRealtimeConflictResolution } from './useRealtimeConflictResolution';
import { supabase } from '@/lib/supabase';
import { Column } from './useColumnsManager';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const rundownId = params.id === 'new' ? null : (location.pathname === '/demo' ? DEMO_RUNDOWN_ID : params.id) || null;
  
  const { shouldSkipLoading, setCacheLoading } = useRundownStateCache(rundownId);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  
  // Connection state will come from realtime hook
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

  // Global teleprompter sync to show blue Wi-Fi when teleprompter saves
  const teleprompterSync = useGlobalTeleprompterSync();

  // Enhanced editing coordination for conflict resolution
  const editingCoordination = useEnhancedEditingCoordination({
    onEditingStateChange: (isEditing, fieldKey) => {
      if (isEditing) {
        console.log('🖊️ Enhanced editing started:', fieldKey);
      } else {
        console.log('✋ Enhanced editing stopped');
      }
    }
  });

  // Realtime conflict resolution
  const conflictResolution = useRealtimeConflictResolution({
    isFieldRecentlyEdited: editingCoordination.isFieldRecentlyEdited,
    isPreparingSave: editingCoordination.isPreparingSave,
    currentItems: state.items
  });

  // Auto-save functionality with enhanced coordination
  const { isSaving, setUndoActive, setTrackOwnUpdate } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    actions.markSaved,
    editingCoordination
  );

  // Standalone undo system - unchanged
  const { saveState: saveUndoState, undo, canUndo, lastAction } = useStandaloneUndo({
    onUndo: (items, _, title) => {
      setUndoActive(true);
      actions.setItems(items);
      actions.setTitle(title);
      
      setTimeout(() => {
        actions.markSaved();
        actions.setItems([...items]);
        setUndoActive(false);
      }, 100);
    },
    setUndoActive
  });

  // Track own updates for realtime filtering
  const ownUpdateTimestampRef = useRef<string | null>(null);

  // Enhanced realtime connection with simplified logic
  const realtimeConnection = useSimpleRealtimeRundown({
    rundownId,
    onRundownUpdate: useCallback((updatedRundown) => {
      console.log('📊 Simplified state received realtime update:', updatedRundown);
      console.log('📊 Current saving state check:', { isSaving, isPreparingSave: editingCoordination.isPreparingSave });
      
      // Enhanced conflict resolution
      const result = conflictResolution.processRealtimeUpdate(updatedRundown, isSaving);
      
      if (!result.shouldApply) {
        console.log('📊 Blocking realtime update:', result.reason);
        return;
      }
      
      console.log('🕒 Marked realtime update timestamp:', updatedRundown.updated_at);
      console.log('📊 APPLYING realtime update to state with conflict resolution');
      
      // Use resolved items if available, otherwise use incoming items
      const itemsToApply = result.resolvedItems || updatedRundown.items || [];
      
      // Load state WITHOUT any showcaller data
      actions.loadState({
        items: itemsToApply,
        columns: [],
        title: updatedRundown.title || 'Untitled Rundown',
        startTime: updatedRundown.start_time || '09:00:00',
        timezone: updatedRundown.timezone || 'America/New_York'
      });
      
      console.log('🔄 Realtime update applied with conflict resolution, item count:', itemsToApply.length);
    }, [actions, isSaving, editingCoordination.isPreparingSave, conflictResolution]),
    enabled: !isLoading,
    trackOwnUpdate: (timestamp: string) => {
      console.log('📝 Tracking own update in realtime:', timestamp);
      ownUpdateTimestampRef.current = timestamp;
    }
  });

  // Connect autosave tracking to realtime tracking
  useEffect(() => {
    if (realtimeConnection.trackOwnUpdate) {
      setTrackOwnUpdate(realtimeConnection.trackOwnUpdate);
    }
  }, [realtimeConnection.trackOwnUpdate, setTrackOwnUpdate]);

  // Update connection status from realtime
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);

  // Enhanced updateItem function with improved coordination
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    
    if (isTypingField) {
      const sessionKey = `${id}-${field}`;
      
      // Enhanced editing coordination
      if (!typingSessionRef.current || typingSessionRef.current.fieldKey !== sessionKey) {
        saveUndoState(state.items, [], state.title, `Edit ${field}`);
        typingSessionRef.current = {
          fieldKey: sessionKey,
          startTime: Date.now()
        };
        
        // Start field edit tracking
        editingCoordination.startFieldEdit(id, field);
      } else {
        // Update activity for existing session
        editingCoordination.updateFieldActivity(id, field);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        typingSessionRef.current = null;
        editingCoordination.endFieldEdit(id, field);
      }, 1000);
    } else if (field === 'duration') {
      saveUndoState(state.items, [], state.title, 'Edit duration');
    } else if (field === 'color') {
      saveUndoState(state.items, [], state.title, 'Change row color');
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
      let updateField = field;
      if (field === 'segmentName') updateField = 'name';
      
      actions.updateItem(id, { [updateField]: value });
    }
  }, [actions.updateItem, state.items, state.title, saveUndoState, editingCoordination]);

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
      if (!rundownId) return;

      // Check if we already have this rundown loaded to prevent reload
      if (isInitialized && state.items.length > 0) {
        console.log('📋 Skipping reload - rundown already loaded:', rundownId);
        return;
      }

      // Don't show loading if we have cached state
      if (shouldSkipLoading) {
        console.log('📋 Skipping loading state - using cached data for:', rundownId);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      setIsLoading(true);
      setCacheLoading(true);
      try {
        // Check if this is a demo rundown
        if (rundownId === DEMO_RUNDOWN_ID) {
          console.log('📋 Loading demo rundown data');
          
          // Load demo data instead of from database
          actions.loadState({
            items: DEMO_RUNDOWN_DATA.items,
            columns: [],
            title: DEMO_RUNDOWN_DATA.title,
            startTime: DEMO_RUNDOWN_DATA.start_time,
            timezone: DEMO_RUNDOWN_DATA.timezone
          });
          
          console.log('✅ Demo rundown loaded successfully');
        } else {
          // Normal database loading for real rundowns
          const { data, error } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId)
            .maybeSingle();

          if (error) {
            console.error('Error loading rundown:', error);
          } else if (data) {
            const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
              ? data.items 
              : createDefaultRundownItems();

            // Load content only (columns handled by useUserColumnPreferences)
            console.log('📋 Loading rundown state without columns (handled by useUserColumnPreferences)');
            actions.loadState({
              items: itemsToLoad,
              columns: [], // Never load columns from rundown - use user preferences
              title: data.title || 'Untitled Rundown',
              startTime: data.start_time || '09:00:00',
              timezone: data.timezone || 'America/New_York'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
        actions.loadState({
          items: createDefaultRundownItems(),
          columns: [],
          title: 'Untitled Rundown',
          startTime: '09:00:00',
          timezone: 'America/New_York'
        });
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        setCacheLoading(false);
      }
    };

    loadRundown();
  }, [rundownId]); // Remove isInitialized dependency to prevent reload

  useEffect(() => {
    if (!rundownId && !isInitialized) {
      actions.loadState({
        items: createDefaultRundownItems(),
        columns: [],
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
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newItem);
    
    actions.setItems(newItems);
  }, [state.items, state.title, saveUndoState, actions.setItems]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
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
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    const newItems = [...state.items];
    const actualIndex = Math.min(insertIndex, newItems.length);
    newItems.splice(actualIndex, 0, newHeader);
    
    actions.setItems(newItems);
  }, [state.items, state.title, saveUndoState, actions.setItems]);

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
    columns,
    setColumns,
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    
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
    isProcessingRealtimeUpdate: realtimeConnection.isProcessingUpdate || teleprompterSync.isTeleprompterSaving || editingCoordination.isPreparingSave,
    
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
    
    // Enhanced editing coordination for cell components
    editingCoordination: {
      startFieldEdit: editingCoordination.startFieldEdit,
      updateFieldActivity: editingCoordination.updateFieldActivity,
      endFieldEdit: editingCoordination.endFieldEdit
    },
    
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

    // Undo functionality - properly expose these including saveUndoState
    saveUndoState,
    undo,
    canUndo,
    lastAction,
    
    // Teleprompter sync callbacks (exposed globally)
    teleprompterSaveHandlers: {
      onSaveStart: teleprompterSync.handleTeleprompterSaveStart,
      onSaveEnd: teleprompterSync.handleTeleprompterSaveEnd
    }
  };
};
