import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { useAuth } from './useAuth';
import { useRundownState } from './useRundownState';
import { useConsolidatedUserColumnPreferences } from './useConsolidatedUserColumnPreferences';
import { useStandaloneUndo } from './useStandaloneUndo';
import { useOptimizedRealtime } from './useOptimizedRealtime';
import { useRundownStateCache } from './useRundownStateCache';
import { supabase } from '@/lib/supabase';
import { useParams } from 'react-router-dom';
import { DEMO_RUNDOWN_ID, DEMO_RUNDOWN_DATA } from '@/data/demoRundownData';
import { createDefaultRundownItems } from '@/data/defaultRundownItems';

// Simplified state without coordinator - direct loading only
export const useSimplifiedRundownStateClean = () => {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const rundownId = params.id || null;

  // Core state management
  const { state, actions, calculations, helpers } = useRundownState();

  // Column preferences
  const {
    columns,
    setColumns,
    isLoading: isLoadingColumns,
    isSaving: isSavingColumns
  } = useConsolidatedUserColumnPreferences(rundownId);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('00:00:00');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [realtimeUpdateCounter, setRealtimeUpdateCounter] = useState(0);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);

  // Refs to prevent duplicate loads
  const loadedRundownId = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Undo functionality
  const { undo, canUndo, lastAction, saveState } = useStandaloneUndo({
    onUndo: (items, columns, title) => {
      actions.loadState({ items, columns, title });
    }
  });

  // Force realtime update helper
  const forceRealtimeUpdate = useCallback(() => {
    const counter = Date.now();
    setRealtimeUpdateCounter(counter);
    console.log('🔄 Force realtime update triggered:', counter);
  }, []);

  // Simplified - no realtime for now to eliminate race conditions

  // Row selection handlers  
  const handleRowSelection = useCallback((itemId: string) => {
    setSelectedRowId(itemId);
  }, []);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  const enhancedActions = {
    updateItem: (id: string, field: string, value: any) => {
      saveState(state.items, columns, state.title, 'Update item');
      actions.updateItem(id, { [field]: value });
    },
    toggleFloat: (id: string) => {
      saveState(state.items, columns, state.title, 'Toggle float');
      helpers.toggleFloat(id);
    },
    deleteRow: (id: string) => {
      saveState(state.items, columns, state.title, 'Delete row');
      actions.deleteItem(id);
    },
    addRow: (index?: number) => {
      saveState(state.items, columns, state.title, 'Add row');
      helpers.addRow(index);
    },
    addHeader: (index?: number) => {
      saveState(state.items, columns, state.title, 'Add header');
      helpers.addHeader(index);
    },
    setTitle: (title: string) => {
      saveState(state.items, columns, state.title, 'Change title');
      actions.setTitle(title);
    }
  };

  // Calculate visible columns
  const visibleColumns = columns.filter(col => col.isVisible);

  // Load rundown data - SIMPLIFIED without coordinator
  useEffect(() => {
    const loadRundown = async () => {
      if (!rundownId || isLoadingRef.current) return;
      
      // Prevent duplicate loads
      if (loadedRundownId.current === rundownId) return;
      
      console.log('📋 Loading rundown state without columns (handled by useUserColumnPreferences)');
      
      isLoadingRef.current = true;
      loadedRundownId.current = rundownId;
      setIsLoading(true);

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
          // Get database timestamp first for cache validation
          const { data: timestampData } = await supabase
            .from('rundowns')
            .select('updated_at')
            .eq('id', rundownId)
            .single();
          
          if (timestampData?.updated_at) {
            console.log('🕒 Database timestamp check:', timestampData.updated_at);
            
            // If we have a recent realtime update that's newer, skip database load
            if (lastRealtimeUpdate && new Date(lastRealtimeUpdate) > new Date(timestampData.updated_at)) {
              console.log('🚫 SKIPPED: Database load - realtime data is newer');
              return;
            }
          }

          // Load rundown data from database
          const { data, error } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId)
            .single();

          if (error) {
            console.error('Failed to load rundown:', error);
            // Load with defaults on error
            actions.loadState({
              items: createDefaultRundownItems(),
              columns: [],
              title: 'Untitled Rundown',
              startTime: '09:00:00',
              timezone: 'America/New_York'
            });
          } else {
            const itemsToLoad = Array.isArray(data.items) ? data.items : [];
            
            // Debug: Log current loading source
            console.log('🐛 DEBUG: Loading state from source: useSimplifiedRundownState with items:', itemsToLoad.length);
            
            // CRITICAL: Don't load empty state when we have valid items
            if (itemsToLoad.length === 0) {
              console.error('🚫 BLOCKED: Attempted to load empty rundown state! Source: useSimplifiedRundownState');
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
        isLoadingRef.current = false;
      }
    };

    if (rundownId) {
      loadRundown();
    }
  }, [rundownId]);

  // Initialize default state when no rundown ID
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

  // Current time update
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      setCurrentTime(timeString);
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total runtime - memoized to prevent unnecessary recalculations
  const totalRuntime = calculations.totalRuntime;

  return {
    // Core data
    items: calculations.itemsWithCalculatedTimes,
    columns,
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    currentTime,
    rundownId,
    
    // State flags
    isLoading: isLoading || isLoadingColumns,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: isSavingColumns,
    isConnected,
    isProcessingRealtimeUpdate,
    
    // Selection
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    // Calculations
    totalRuntime,
    getRowNumber: helpers.getRowNumber,
    getHeaderDuration: helpers.getHeaderDuration,
    
    // Enhanced actions with undo
    updateItem: enhancedActions.updateItem,
    deleteRow: enhancedActions.deleteRow,
    toggleFloat: enhancedActions.toggleFloat,
    deleteMultipleItems: (ids: string[]) => {
      saveState(state.items, columns, state.title, 'Delete multiple items');
      actions.deleteMultipleItems(ids);
    },
    addItem: actions.addItem,
    setTitle: enhancedActions.setTitle,
    setStartTime: actions.setStartTime,
    setTimezone: actions.setTimezone,
    setItems: actions.setItems,
    addRow: enhancedActions.addRow,
    addHeader: enhancedActions.addHeader,
    
    // Row operations with index
    addRowAtIndex: (index: number) => {
      saveState(state.items, columns, state.title, 'Add segment');
      helpers.addRow(index);
    },
    addHeaderAtIndex: (index: number) => {
      saveState(state.items, columns, state.title, 'Add header');
      helpers.addHeader(index);
    },
    
    // Column management
    addColumn: (column: any) => {
      const newColumns = [...columns, column];
      setColumns(newColumns);
    },
    updateColumnWidth: (columnId: string, width: string) => {
      const newColumns = columns.map(col => 
        col.id === columnId ? { ...col, width } : col
      );
      setColumns(newColumns);
    },
    setColumns,
    
    // Undo
    undo,
    canUndo,
    lastAction
  };
};