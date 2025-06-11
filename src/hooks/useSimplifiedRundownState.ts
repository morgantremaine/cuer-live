
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { usePlaybackControls } from './usePlaybackControls';
import { supabase } from '@/lib/supabase';
import { Column } from './useColumnsManager';
import { defaultRundownItems } from '@/data/defaultRundownItems';
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

  // Auto-save functionality
  const { isSaving } = useSimpleAutoSave(state, rundownId, actions.markSaved);

  // Enhanced updateItem function that works with showcaller
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    console.log('📺 Enhanced updateItem called:', { id, field, value });
    
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
          // Load the data into state, ensuring we have valid items and columns
          const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
            ? data.items 
            : defaultRundownItems;
          
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
        // Load defaults if there's an error
        actions.loadState({
          items: defaultRundownItems,
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

  // Initialize with defaults for new rundowns
  useEffect(() => {
    if (!rundownId && !isInitialized) {
      actions.loadState({
        items: defaultRundownItems,
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

  // Enhanced action wrappers
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: enhancedUpdateItem,

    toggleFloatRow: useCallback((id: string) => {
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items]),

    deleteRow: useCallback((id: string) => {
      actions.deleteItem(id);
    }, [actions.deleteItem])
  };

  // Get visible columns - ensure they actually exist and are marked visible
  const visibleColumns = useMemo(() => {
    if (!state.columns || !Array.isArray(state.columns)) {
      return defaultColumns.filter(col => col.isVisible !== false);
    }
    
    const visible = state.columns.filter(col => col.isVisible !== false);
    return visible;
  }, [state.columns]);

  // Helper function to get header duration using calculated items
  const getHeaderDuration = useCallback((index: number) => {
    if (index === -1 || !state.items || index >= state.items.length) return '00:00:00';
    return calculateHeaderDuration(state.items, index);
  }, [state.items]);

  // Helper function to get row number from calculated items
  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= calculatedItems.length) return '';
    return calculatedItems[index].calculatedRowNumber;
  }, [calculatedItems]);

  // Row selection handlers
  const handleRowSelection = useCallback((itemId: string) => {
    console.log('🎯 Simplified state handleRowSelection called with:', itemId, 'current selected:', selectedRowId);
    setSelectedRowId(prev => {
      const newSelection = prev === itemId ? null : itemId;
      console.log('🎯 Setting selectedRowId to:', newSelection);
      return newSelection;
    });
  }, [selectedRowId]);

  const clearRowSelection = useCallback(() => {
    console.log('🎯 Simplified state clearRowSelection called');
    setSelectedRowId(null);
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
    
    // Selection state
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    
    // Metadata
    currentTime,
    rundownId,
    isLoading,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving,
    showcallerActivity,
    
    // Playback controls - properly expose these functions with correct signatures
    play: (selectedSegmentId?: string) => {
      console.log('🎮 Simplified state play called with:', selectedSegmentId);
      play(selectedSegmentId);
    },
    pause: () => {
      console.log('🎮 Simplified state pause called');
      pause();
    },
    forward: () => {
      console.log('🎮 Simplified state forward called');
      forward();
    },
    backward: () => {
      console.log('🎮 Simplified state backward called');
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
    
    // Actions with correct signatures
    updateItem: enhancedActions.updateItem,
    deleteItem: enhancedActions.deleteRow,
    deleteRow: enhancedActions.deleteRow,
    toggleFloat: enhancedActions.toggleFloatRow,
    deleteMultipleItems: actions.deleteMultipleItems,
    addItem: actions.addItem,
    setTitle: actions.setTitle,
    setStartTime: actions.setStartTime,
    setTimezone: actions.setTimezone,
    
    // Row operations that will be enhanced in coordination
    addRow: helpers.addRow,
    addHeader: helpers.addHeader,
    
    // Column management
    addColumn: (column: Column) => {
      actions.setColumns([...(state.columns || defaultColumns), column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      actions.updateColumn(columnId, { width });
    }
  };
};
