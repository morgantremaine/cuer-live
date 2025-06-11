
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
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
        console.log('🔄 Loading rundown from database:', rundownId);
        
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('Error loading rundown:', error);
        } else if (data) {
          console.log('📋 Loaded rundown data:', data);
          
          // Load the data into state, ensuring we have valid items and columns
          const itemsToLoad = Array.isArray(data.items) && data.items.length > 0 
            ? data.items 
            : defaultRundownItems;
          
          const columnsToLoad = Array.isArray(data.columns) && data.columns.length > 0 
            ? data.columns 
            : defaultColumns;

          console.log('📋 Loading items:', itemsToLoad.length, 'columns:', columnsToLoad.length);

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
      console.log('🆕 Initializing new rundown with defaults');
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
      console.log('⚠️ No items available for calculation');
      return [];
    }
    
    console.log('🧮 Calculating items with timing:', state.items.length, 'start time:', state.startTime);
    const calculated = calculateItemsWithTiming(state.items, state.startTime);
    console.log('🧮 Calculated items:', calculated.length, 'first item times:', calculated[0] ? {
      start: calculated[0].calculatedStartTime,
      end: calculated[0].calculatedEndTime,
      rowNumber: calculated[0].calculatedRowNumber
    } : 'no items');
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
    
    updateItem: useCallback((id: string, field: string, value: string) => {
      console.log('📝 Updating item:', id, field, value);
      
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
    }, [actions.updateItem, state.items]),

    toggleFloat: useCallback((id: string) => {
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items]),

    deleteRow: useCallback((id: string) => {
      console.log('🗑️ Deleting row:', id);
      actions.deleteItem(id);
    }, [actions.deleteItem])
  };

  // Get visible columns - ensure they actually exist and are marked visible
  const visibleColumns = useMemo(() => {
    if (!state.columns || !Array.isArray(state.columns)) {
      console.log('⚠️ No columns available, using defaults');
      return defaultColumns.filter(col => col.isVisible !== false);
    }
    
    const visible = state.columns.filter(col => col.isVisible !== false);
    console.log('👁️ Visible columns:', visible.length, 'of', state.columns.length);
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

  // Define addRow and addHeader functions with proper positioning
  const addRowFunction = useCallback((targetRowId?: string) => {
    console.log('➕ Adding new row after:', targetRowId || selectedRowId || 'end');
    
    if (targetRowId || selectedRowId) {
      const targetId = targetRowId || selectedRowId;
      const targetIndex = state.items.findIndex(item => item.id === targetId);
      if (targetIndex !== -1) {
        helpers.addRow(targetIndex + 1);
      } else {
        helpers.addRow();
      }
    } else {
      helpers.addRow();
    }
  }, [helpers, selectedRowId, state.items]);

  const addHeaderFunction = useCallback((targetRowId?: string) => {
    console.log('➕ Adding new header after:', targetRowId || selectedRowId || 'end');
    
    if (targetRowId || selectedRowId) {
      const targetId = targetRowId || selectedRowId;
      const targetIndex = state.items.findIndex(item => item.id === targetId);
      if (targetIndex !== -1) {
        helpers.addHeader(targetIndex + 1);
      } else {
        helpers.addHeader();
      }
    } else {
      helpers.addHeader();
    }
  }, [helpers, selectedRowId, state.items]);

  // Row selection handlers
  const handleRowSelection = useCallback((itemId: string) => {
    console.log('🎯 Selecting row:', itemId);
    setSelectedRowId(prev => prev === itemId ? null : itemId);
  }, []);

  const clearRowSelection = useCallback(() => {
    console.log('🎯 Clearing row selection');
    setSelectedRowId(null);
  }, []);

  console.log('🔄 State summary:', {
    items: calculatedItems.length,
    columns: state.columns?.length || 0,
    visibleColumns: visibleColumns.length,
    title: state.title,
    startTime: state.startTime,
    isLoading,
    hasUnsavedChanges: state.hasUnsavedChanges,
    selectedRowId
  });

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
    currentSegmentId: state.currentSegmentId,
    isPlaying: state.isPlaying,
    
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
    toggleFloat: enhancedActions.toggleFloat,
    deleteMultipleItems: actions.deleteMultipleItems,
    addItem: actions.addItem,
    setTitle: actions.setTitle,
    setStartTime: actions.setStartTime,
    setTimezone: actions.setTimezone,
    
    // Row operations with proper signatures
    addRow: addRowFunction,
    addHeader: addHeaderFunction,
    
    // Column management
    addColumn: (column: Column) => {
      actions.setColumns([...(state.columns || defaultColumns), column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      actions.updateColumn(columnId, { width });
    }
  };
};
