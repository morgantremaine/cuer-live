
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

  // Initialize with default data
  const {
    state,
    calculations,
    actions,
    helpers
  } = useRundownState({
    items: defaultRundownItems,
    columns: [
      { id: 'segmentName', name: 'Segment', key: 'segmentName', isVisible: true, width: 200, isCustom: false },
      { id: 'duration', name: 'Duration', key: 'duration', isVisible: true, width: 100, isCustom: false },
      { id: 'startTime', name: 'Start', key: 'startTime', isVisible: true, width: 100, isCustom: false },
      { id: 'endTime', name: 'End', key: 'endTime', isVisible: true, width: 100, isCustom: false },
      { id: 'talent', name: 'Talent', key: 'talent', isVisible: true, width: 150, isCustom: false },
      { id: 'script', name: 'Script', key: 'script', isVisible: true, width: 300, isCustom: false }
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
    }, [actions.updateItem, state.items])
  };

  // Get visible columns
  const visibleColumns = state.columns.filter(col => col.isVisible !== false);

  return {
    // Core state
    items: calculations.itemsWithCalculatedTimes,
    columns: state.columns,
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
    
    // Actions
    ...enhancedActions,
    
    // Column management
    addColumn: (column: Column) => {
      actions.setColumns([...state.columns, column]);
    },
    
    updateColumnWidth: (columnId: string, width: number) => {
      actions.updateColumn(columnId, { width });
    }
  };
};
