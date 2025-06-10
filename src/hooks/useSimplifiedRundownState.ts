
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownState } from './useRundownState';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { supabase } from '@/lib/supabase';
import { Column } from './useColumnsManager';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useSimplifiedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id === 'new' ? null : params.id || null;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with default data - add missing isEditable property
  const {
    state,
    calculations,
    actions,
    helpers
  } = useRundownState({
    items: defaultRundownItems,
    columns: [
      { id: 'segmentName', name: 'Segment', key: 'segmentName', isVisible: true, width: '200px', isCustom: false, isEditable: true },
      { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: '100px', isCustom: false, isEditable: true },
      { id: 'startTime', name: 'Start', key: 'startTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
      { id: 'endTime', name: 'End', key: 'endTime', isVisible: true, width: '100px', isCustom: false, isEditable: false },
      { id: 'talent', name: 'Talent', key: 'talent', isVisible: true, width: '150px', isCustom: false, isEditable: true },
      { id: 'script', name: 'Script', key: 'script', isVisible: true, width: '300px', isCustom: false, isEditable: true }
    ]
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
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('Error loading rundown:', error);
        } else if (data) {
          actions.loadState({
            items: data.items || defaultRundownItems,
            columns: data.columns || state.columns,
            title: data.title || 'Untitled Rundown',
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'UTC'
          });
        }
      } catch (error) {
        console.error('Failed to load rundown:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadRundown();
  }, [rundownId, isInitialized]);

  // Enhanced action wrappers that include field-specific logic
  const enhancedActions = {
    ...actions,
    ...helpers,
    
    updateItem: useCallback((id: string, field: string, value: string) => {
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
        actions.updateItem(id, { [field]: value });
      }
    }, [actions.updateItem, state.items]),

    // Fix toggleFloat to match expected signature
    toggleFloat: useCallback((id: string) => {
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    }, [actions.updateItem, state.items]),

    // Fix deleteRow to match expected signature
    deleteRow: useCallback((id: string) => {
      actions.deleteItem(id);
    }, [actions.deleteItem])
  };

  // Get visible columns
  const visibleColumns = state.columns.filter(col => col.isVisible !== false);

  return {
    // Core state
    items: calculations.itemsWithCalculatedTimes,
    setItems: actions.setItems,
    columns: state.columns,
    setColumns: actions.setColumns,
    visibleColumns,
    rundownTitle: state.title,
    rundownStartTime: state.startTime,
    timezone: state.timezone,
    currentSegmentId: state.currentSegmentId,
    isPlaying: state.isPlaying,
    
    // Metadata
    currentTime,
    rundownId,
    isLoading,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving,
    
    // Calculations
    totalRuntime: calculations.totalRuntime,
    getRowNumber: helpers.getRowNumber,
    getHeaderDuration: helpers.getHeaderDuration,
    
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
    addRow: useCallback(() => helpers.addRow(), [helpers.addRow]),
    addHeader: useCallback(() => helpers.addHeader(), [helpers.addHeader]),
    
    // Column management
    addColumn: (column: Column) => {
      actions.setColumns([...state.columns, column]);
    },
    
    updateColumnWidth: (columnId: string, width: string) => {
      actions.updateColumn(columnId, { width });
    }
  };
};
