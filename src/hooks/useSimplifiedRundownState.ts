import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useSimpleRealtimeRundown } from './useSimpleRealtimeRundown';
import { useUserColumnPreferences } from './useUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useGlobalTeleprompterSync } from './useGlobalTeleprompterSync';
import { useRundownResumption } from './useRundownResumption';
import { supabase } from '@/integrations/supabase/client';
import { Column } from './useColumnsManager';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { updateTimeFromServer } from '@/services/UniversalTimeService';

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
  const [lastKnownTimestamp, setLastKnownTimestamp] = useState<string | null>(null);
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);

  // Enhanced typing session tracking with field-level protection
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recentlyEditedFieldsRef = useRef<Map<string, number>>(new Map());
  const PROTECTION_WINDOW_MS = 10000; // 10 second protection window (extended for safety)

  // Structural change protection
  const structuralDirtyRef = useRef(false);
  const lastStructuralAtRef = useRef<number>(0);

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

  // Handle conflict resolution from auto-save
  const handleConflictResolved = useCallback((mergedData: any) => {
    console.log('🔄 Applying conflict resolution:', mergedData);
    
    // Apply merged data to state
    actions.loadState({
      items: mergedData.items || [],
      columns: [], // Keep columns separate
      title: mergedData.title || state.title,
      startTime: mergedData.start_time || state.startTime,
      timezone: mergedData.timezone || state.timezone
    });
    
    // Update timestamp
    if (mergedData.updated_at) {
      setLastKnownTimestamp(mergedData.updated_at);
    }
  }, [actions, state.title, state.startTime, state.timezone]);

  // Auto-save functionality with concurrency control
  const { isSaving, setUndoActive, setTrackOwnUpdate, setUserTyping, markStructuralChange } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    () => {
      actions.markSaved();
      structuralDirtyRef.current = false; // Reset structural flag when saved
    }
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

  // Create protected fields set for granular updates
  const getProtectedFields = useCallback(() => {
    const protectedFields = new Set<string>();
    const now = Date.now();
    
    // Add currently typing field if any
    if (typingSessionRef.current) {
      console.log('🛡️ Protecting currently typing field:', typingSessionRef.current.fieldKey);
      protectedFields.add(typingSessionRef.current.fieldKey);
    }
    
    // Add recently edited fields within protection window
    recentlyEditedFieldsRef.current.forEach((timestamp, fieldKey) => {
      if (now - timestamp < PROTECTION_WINDOW_MS) {
        protectedFields.add(fieldKey);
      } else {
        // Clean up expired fields
        recentlyEditedFieldsRef.current.delete(fieldKey);
      }
    });
    
    // Add global title/timing fields if they're being edited
    if (typingSessionRef.current?.fieldKey === 'title') {
      protectedFields.add('title');
    }
    if (typingSessionRef.current?.fieldKey === 'startTime') {
      protectedFields.add('startTime');
    }
    if (typingSessionRef.current?.fieldKey === 'timezone') {
      protectedFields.add('timezone');
    }
    
    return protectedFields;
  }, []);

  // Enhanced realtime connection with granular update logic
  const realtimeConnection = useSimpleRealtimeRundown({
    rundownId,
    onRundownUpdate: useCallback((updatedRundown) => {
      console.log('📊 Simplified state received realtime update:', updatedRundown);
      console.log('📊 Current saving state check:', { isSaving, structuralDirty: structuralDirtyRef.current });
      
      // Skip update if saving OR if we have unsaved structural changes
      const hasStructuralChanges = updatedRundown.items && Array.isArray(updatedRundown.items);
      const shouldSkipUpdate = isSaving || (structuralDirtyRef.current && hasStructuralChanges);
      
      if (!shouldSkipUpdate) {
        console.log('🕒 Processing granular realtime update:', updatedRundown.updated_at);
        
        // Update our known timestamp
        if (updatedRundown.updated_at) {
          setLastKnownTimestamp(updatedRundown.updated_at);
        }
        
        // Get currently protected fields
        const protectedFields = getProtectedFields();
        console.log('🛡️ Protected fields during update:', Array.from(protectedFields));
        
        // Load state directly without field protection for now
        actions.loadState({
          items: updatedRundown.items || [],
          title: updatedRundown.title,
          startTime: updatedRundown.start_time,
          timezone: updatedRundown.timezone
        });
        
        console.log('🔄 Granular realtime update applied, item count:', updatedRundown.items?.length || 0);
      } else {
        const reason = isSaving ? 'currently saving' : 'structural changes in progress';
        console.log(`📊 Deferring realtime update - ${reason}`);
      }
    }, [actions, isSaving, getProtectedFields]),
    enabled: !isLoading,
    trackOwnUpdate: (timestamp: string) => {
      console.log('📝 Tracking own update in realtime:', timestamp);
      ownUpdateTimestampRef.current = timestamp;
    }
  });

  // Connect autosave tracking to realtime tracking
  useEffect(() => {
    if (realtimeConnection.trackOwnUpdate) {
      setTrackOwnUpdate((timestamp: string, isStructural?: boolean) => {
        realtimeConnection.trackOwnUpdate(timestamp, isStructural);
      });
    }
  }, [realtimeConnection.trackOwnUpdate, setTrackOwnUpdate]);

  // Update connection status from realtime
  useEffect(() => {
    setIsConnected(realtimeConnection.isConnected);
  }, [realtimeConnection.isConnected]);

  // Enhanced updateItem function with field-level protection tracking
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    
    if (isTypingField) {
      const sessionKey = `${id}-${field}`;
      
      // Track this field as recently edited for protection window
      recentlyEditedFieldsRef.current.set(sessionKey, Date.now());
      
      if (!typingSessionRef.current || typingSessionRef.current.fieldKey !== sessionKey) {
        saveUndoState(state.items, [], state.title, `Edit ${field}`);
        typingSessionRef.current = {
          fieldKey: sessionKey,
          startTime: Date.now()
        };
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        typingSessionRef.current = null;
      }, 5000); // Extended to 5 seconds for better protection
    } else if (field === 'duration') {
      const sessionKey = `${id}-${field}`;
      recentlyEditedFieldsRef.current.set(sessionKey, Date.now());
      saveUndoState(state.items, [], state.title, 'Edit duration');
    } else if (field === 'color') {
      const sessionKey = `${id}-${field}`;
      recentlyEditedFieldsRef.current.set(sessionKey, Date.now());
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
  }, [actions.updateItem, state.items, state.title, saveUndoState]);

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

            // Sync time from server timestamp and store it
            if (data.updated_at) {
              updateTimeFromServer(data.updated_at);
              setLastKnownTimestamp(data.updated_at);
            }

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

  // Handle data refreshing from resumption
  const handleDataRefresh = useCallback((latestData: any) => {
    console.log('🔄 Refreshing rundown data from resumption:', latestData);
    
    // Update timestamp first
    if (latestData.updated_at) {
      setLastKnownTimestamp(latestData.updated_at);
      updateTimeFromServer(latestData.updated_at);
    }
    
    // Get currently protected fields to preserve local edits
    const protectedFields = getProtectedFields();
    
    // Load new data directly
    actions.loadState({
      items: latestData.items || [],
      title: latestData.title,
      startTime: latestData.start_time,
      timezone: latestData.timezone
    });
  }, [actions, getProtectedFields]);

  // Set up resumption handling
  useRundownResumption({
    rundownId,
    onDataRefresh: handleDataRefresh,
    lastKnownTimestamp,
    enabled: isInitialized && !isLoading && !structuralDirtyRef.current && !state.hasUnsavedChanges,
    updateLastKnownTimestamp: setLastKnownTimestamp
  });

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
      structuralDirtyRef.current = true;
      lastStructuralAtRef.current = Date.now();
      markStructuralChange(); // Mark this as a structural change
      actions.deleteItem(id);
    }, [actions.deleteItem, state.items, state.title, saveUndoState, markStructuralChange]),

    addRow: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add segment');
      structuralDirtyRef.current = true;
      lastStructuralAtRef.current = Date.now();
      markStructuralChange(); // Mark this as a structural change
      helpers.addRow();
    }, [helpers.addRow, state.items, state.title, saveUndoState, markStructuralChange]),

    addHeader: useCallback(() => {
      saveUndoState(state.items, [], state.title, 'Add header');
      structuralDirtyRef.current = true;
      lastStructuralAtRef.current = Date.now();
      markStructuralChange(); // Mark this as a structural change
      helpers.addHeader();
    }, [helpers.addHeader, state.items, state.title, saveUndoState, markStructuralChange]),

    setTitle: useCallback((newTitle: string) => {
      if (state.title !== newTitle) {
        // Track title editing for protection
        recentlyEditedFieldsRef.current.set('title', Date.now());
        typingSessionRef.current = { fieldKey: 'title', startTime: Date.now() };
        
        saveUndoState(state.items, [], state.title, 'Change title');
        actions.setTitle(newTitle);
        
        // Clear typing session after delay
        setTimeout(() => {
          if (typingSessionRef.current?.fieldKey === 'title') {
            typingSessionRef.current = null;
          }
        }, 5000); // Extended timeout for title editing
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
    structuralDirtyRef.current = true;
    lastStructuralAtRef.current = Date.now();
    markStructuralChange(); // Mark this as a structural change
    
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
  }, [state.items, state.title, saveUndoState, actions.setItems, markStructuralChange]);

  // Fixed addHeaderAtIndex that properly inserts at specified index
  const addHeaderAtIndex = useCallback((insertIndex: number) => {
    saveUndoState(state.items, [], state.title, 'Add header');
    structuralDirtyRef.current = true;
    lastStructuralAtRef.current = Date.now();
    markStructuralChange(); // Mark this as a structural change
    
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
  }, [state.items, state.title, saveUndoState, actions.setItems, markStructuralChange]);

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
    lastKnownTimestamp,
    
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
    isProcessingRealtimeUpdate: realtimeConnection.isProcessingUpdate || teleprompterSync.isTeleprompterSaving,
    
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
    deleteMultipleItems: useCallback((itemIds: string[]) => {
      saveUndoState(state.items, [], state.title, 'Delete multiple items');
      structuralDirtyRef.current = true;
      lastStructuralAtRef.current = Date.now();
      markStructuralChange(); // Mark this as a structural change
      actions.deleteMultipleItems(itemIds);
    }, [actions.deleteMultipleItems, state.items, state.title, saveUndoState, markStructuralChange]),
    addItem: actions.addItem,
    setTitle: enhancedActions.setTitle,
    setStartTime: useCallback((newStartTime: string) => {
      // Track start time editing for protection
      recentlyEditedFieldsRef.current.set('startTime', Date.now());
      typingSessionRef.current = { fieldKey: 'startTime', startTime: Date.now() };
      
      actions.setStartTime(newStartTime);
      
      // Clear typing session after delay
      setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === 'startTime') {
          typingSessionRef.current = null;
        }
      }, 5000); // Extended timeout for start time editing
    }, [actions.setStartTime]),
    setTimezone: useCallback((newTimezone: string) => {
      // Track timezone editing for protection
      recentlyEditedFieldsRef.current.set('timezone', Date.now());
      typingSessionRef.current = { fieldKey: 'timezone', startTime: Date.now() };
      
      actions.setTimezone(newTimezone);
      
      // Clear typing session after delay
      setTimeout(() => {
        if (typingSessionRef.current?.fieldKey === 'timezone') {
          typingSessionRef.current = null;
        }
      }, 5000); // Extended timeout for timezone editing
    }, [actions.setTimezone]),
    
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
    },
    
    // Auto-save utilities
    setUserTyping
  };
};
