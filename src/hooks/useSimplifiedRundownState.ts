import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useOptimizedRealtime } from './useOptimizedRealtime';
import { useConsolidatedUserColumnPreferences } from './useConsolidatedUserColumnPreferences';
import { useRundownStateCache } from './useRundownStateCache';
import { useStateLoadingCoordinator } from './useStateLoadingCoordinator';
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
  const { startCoordinatedLoad, getCurrentLoadingSource, isCurrentlyLoading, markRealtimeUpdate } = useStateLoadingCoordinator(rundownId);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(!shouldSkipLoading);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showcallerActivity, setShowcallerActivity] = useState(false);
  
  // Connection state will come from realtime hook
  const [isConnected, setIsConnected] = useState(false);
  
  // Force re-render mechanism for realtime updates
  const [realtimeUpdateCounter, setRealtimeUpdateCounter] = useState(0);
  const forceRealtimeUpdate = useCallback(() => {
    const newCounter = Date.now();
    console.log('🔄 Force realtime update triggered:', newCounter);
    setRealtimeUpdateCounter(newCounter);
  }, []);

  // Typing session tracking
  const typingSessionRef = useRef<{ fieldKey: string; startTime: number } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLoadedRundownId = useRef<string | null>(null);

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
  } = useConsolidatedUserColumnPreferences(rundownId);

  // Auto-save functionality - now COMPLETELY EXCLUDES showcaller operations
  const { isSaving, setUndoActive, setTrackOwnUpdate } = useSimpleAutoSave(
    {
      ...state,
      columns: [] // Remove columns from team sync
    }, 
    rundownId, 
    actions.markSaved
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

  // Optimized realtime with connection persistence
  const optimizedRealtime = useOptimizedRealtime({
    rundownId,
    onRundownUpdate: useCallback((updatedRundown) => {
      console.log('📊 Simplified state received realtime update:', updatedRundown);
      console.log('📊 Current saving state check:', { isSaving, willApplyUpdate: !isSaving });
      
      // Mark realtime data in coordinator to prevent stale database loads
      const realtimeTimestamp = updatedRundown.updated_at || new Date().toISOString();
      markRealtimeUpdate(realtimeTimestamp);
      console.log('🕒 Marked realtime update timestamp:', realtimeTimestamp);
      
      // Only update if we're not currently saving to avoid conflicts
      if (!isSaving) {
        console.log('📊 APPLYING realtime update to state');
        
        // Force fresh state references to ensure React detects the change
        const freshItems = Array.isArray(updatedRundown.items) 
          ? updatedRundown.items.map((item, index) => ({ 
              ...item, 
              __realtimeKey: `${item.id}_${Date.now()}_${index}` // Force React re-render
            }))
          : [];
        
         // Load state WITHOUT any showcaller data FIRST
         actions.loadState({
           items: freshItems,
           columns: [],
           title: updatedRundown.title || 'Untitled Rundown',
           startTime: updatedRundown.start_time || '09:00:00',
           timezone: updatedRundown.timezone || 'America/New_York'
         });
         
         // THEN force re-render AFTER state update to ensure components see fresh data
         forceRealtimeUpdate();
         
         console.log('🔄 Realtime update applied with fresh references, item count:', freshItems.length);
      } else {
        console.log('⏸️ SKIPPING realtime update due to active save operation');
      }
    }, [actions, isSaving, forceRealtimeUpdate, markRealtimeUpdate]),
    enabled: !!rundownId,  // Enable as soon as we have a rundown ID
    hasUnsavedChanges: state.hasUnsavedChanges,
    trackOwnUpdate: useCallback((timestamp: string) => {
      // Track our own updates to prevent showing blue icon for our changes
      console.log('📝 Tracking own update in realtime:', timestamp);
    }, [])
  });

  // Debug realtime status
  useEffect(() => {
    console.log('🔍 Realtime Status Debug:', {
      rundownId,
      enabled: !!rundownId,
      isConnected: optimizedRealtime.isConnected,
      hasUnsavedChanges: state.hasUnsavedChanges,
      isSaving
    });
  }, [rundownId, optimizedRealtime.isConnected, state.hasUnsavedChanges, isSaving]);

  // Connect autosave tracking to realtime tracking
  useEffect(() => {
    if (optimizedRealtime.trackOwnUpdate) {
      setTrackOwnUpdate(optimizedRealtime.trackOwnUpdate);
    }
  }, [optimizedRealtime.trackOwnUpdate, setTrackOwnUpdate]);

  // Update connection status from optimized realtime
  useEffect(() => {
    setIsConnected(optimizedRealtime.isConnected);
  }, [optimizedRealtime.isConnected]);

  // Enhanced updateItem function - NO showcaller interference
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    // Check if this is a typing field
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || field === 'notes' || 
                         field === 'gfx' || field === 'video' || field === 'images' || field.startsWith('customFields.') || field === 'segmentName';
    
    if (isTypingField) {
      const sessionKey = `${id}-${field}`;
      
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
      if (isInitialized && state.items.length > 0 && lastLoadedRundownId.current === rundownId) {
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

      // First check database timestamp to avoid loading stale data
      let dbTimestamp: string | undefined;
      try {
        const { data: timestampData } = await supabase
          .from('rundowns')
          .select('updated_at')
          .eq('id', rundownId)
          .maybeSingle();
        
        dbTimestamp = timestampData?.updated_at;
        console.log('🕒 Database timestamp check:', dbTimestamp);
      } catch (error) {
        console.error('Error checking rundown timestamp:', error);
      }

      // Use coordinated loading to prevent race conditions with timestamp validation
      const wasStarted = await startCoordinatedLoad('useSimplifiedRundownState', async () => {
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
            
            // Debug: Log current loading source
            const currentSource = getCurrentLoadingSource();
            console.log('🐛 DEBUG: Loading state from source:', currentSource, 'with items:', itemsToLoad.length);
            
            // CRITICAL: Don't load empty state when we have valid items
            if (itemsToLoad.length === 0) {
              console.error('🚫 BLOCKED: Attempted to load empty rundown state! Source:', currentSource);
              return; // Exit early, don't load empty state
            }
            
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
        lastLoadedRundownId.current = rundownId;
      }
      }, dbTimestamp); // Pass database timestamp for staleness check

      if (!wasStarted) {
        console.log('🔒 useSimplifiedRundownState: Load blocked by coordinator');
        setIsLoading(false);
      }
    };

    loadRundown();
  }, [rundownId, startCoordinatedLoad]); // Remove isInitialized dependency to prevent reload

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

  // Calculate all derived values using pure functions with realtime invalidation
  const calculatedItems = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) {
      console.log('🔄 calculatedItems: empty items array, returning []');
      return [];
    }
    
    console.log('🔄 calculatedItems: recalculating with', state.items.length, 'items, counter:', realtimeUpdateCounter);
    const calculated = calculateItemsWithTiming(state.items, state.startTime);
    console.log('🔄 calculatedItems: calculated', calculated.length, 'items');
    return calculated;
  }, [state.items, state.startTime, state.lastChanged, realtimeUpdateCounter]);

  const totalRuntime = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) return '00:00:00';
    console.log('🔄 totalRuntime: recalculating with', state.items.length, 'items, counter:', realtimeUpdateCounter);
    const runtime = calculateTotalRuntime(state.items);
    console.log('🔄 totalRuntime: calculated runtime:', runtime);
    return runtime;
  }, [state.items, state.lastChanged, realtimeUpdateCounter]);

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
  }, [state.items, state.lastChanged, realtimeUpdateCounter]);

  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= calculatedItems.length) return '';
    return calculatedItems[index].calculatedRowNumber;
  }, [calculatedItems, realtimeUpdateCounter]);

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
    
    // Realtime connection status and invalidation key
    isConnected,
    isProcessingRealtimeUpdate: optimizedRealtime.isProcessingUpdate,
    realtimeUpdateCounter, // Critical: This forces React components to re-render
    
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

    // Undo functionality - properly expose these including saveUndoState
    saveUndoState,
    undo,
    canUndo,
    lastAction
  };
};
