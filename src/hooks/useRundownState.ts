
import { useReducer, useCallback, useMemo } from 'react';
import { useRundownBroadcast } from './useRundownBroadcast';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';
import { debugLogger } from '@/utils/debugLogger';

export interface RundownState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  startTime: string;
  timezone: string;
  showDate?: Date | null;
  externalNotes?: any;
  currentSegmentId: string | null;
  isPlaying: boolean;
  hasUnsavedChanges: boolean;
  lastChanged: number;
  docVersion?: number; // Add docVersion to track server version for OCC
}

type RundownAction = 
  | { type: 'SET_ITEMS'; payload: RundownItem[] }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<RundownItem> } }
  | { type: 'ADD_ITEM'; payload: { item: RundownItem; insertIndex?: number } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'DELETE_MULTIPLE_ITEMS'; payload: string[] }
  | { type: 'REORDER_ITEMS'; payload: { fromIndex: number; toIndex: number; count?: number } }
  | { type: 'SET_COLUMNS'; payload: Column[] }
  | { type: 'UPDATE_COLUMN'; payload: { id: string; updates: Partial<Column> } }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_START_TIME'; payload: string }
  | { type: 'SET_TIMEZONE'; payload: string }
  | { type: 'SET_SHOW_DATE'; payload: Date | null }
  | { type: 'SET_EXTERNAL_NOTES'; payload: any }
  | { type: 'SET_CURRENT_SEGMENT'; payload: string | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'SET_DOC_VERSION'; payload: number } // Add action to set docVersion
  | { type: 'LOAD_STATE'; payload: Partial<RundownState> }
  | { type: 'LOAD_REMOTE_STATE'; payload: Partial<RundownState> }; // Silent load for remote updates

const initialState: RundownState = {
  items: [],
  columns: [],
  title: RUNDOWN_DEFAULTS.DEFAULT_RUNDOWN_TITLE,
  startTime: RUNDOWN_DEFAULTS.DEFAULT_START_TIME,
  timezone: RUNDOWN_DEFAULTS.DEFAULT_TIMEZONE,
  showDate: null,
  externalNotes: null,
  currentSegmentId: null,
  isPlaying: false,
  hasUnsavedChanges: false,
  lastChanged: 0,
  docVersion: 0 // Initialize docVersion
};

function rundownReducer(state: RundownState, action: RundownAction): RundownState {
  const markChanged = (newState: Partial<RundownState>, actionType?: string) => {
    console.log('📝 CONTENT CHANGE: Setting hasUnsavedChanges=true', {
      action: actionType,
      isContentChange: true,
      reason: 'Actual content modification detected'
    });
    debugLogger.autosave('Content change flagged (hasUnsavedChanges=true) via action:', actionType);
    try {
      debugLogger.autosave('Save cause trace');
    } catch {}
    return {
      ...state,
      ...newState,
      hasUnsavedChanges: true,
      lastChanged: Date.now()
    };
  };

  switch (action.type) {
    case 'SET_ITEMS':
      return markChanged({ items: action.payload }, 'SET_ITEMS');

    case 'UPDATE_ITEM': {
      const items = state.items.map(item =>
        item.id === action.payload.id 
          ? { ...item, ...action.payload.updates }
          : item
      );
      return markChanged({ items }, 'UPDATE_ITEM');
    }

    case 'ADD_ITEM': {
      const { item, insertIndex } = action.payload;
      let items;
      if (insertIndex !== undefined) {
        items = [...state.items];
        items.splice(insertIndex, 0, item);
      } else {
        items = [...state.items, item];
      }
      return markChanged({ items: clearHeaderNumbers(items) }, 'ADD_ITEM');
    }

    case 'DELETE_ITEM': {
      const items = state.items.filter(item => item.id !== action.payload);
      return markChanged({ items: clearHeaderNumbers(items) }, 'DELETE_ITEM');
    }

    case 'DELETE_MULTIPLE_ITEMS': {
      const items = state.items.filter(item => !action.payload.includes(item.id));
      return markChanged({ items: clearHeaderNumbers(items) }, 'DELETE_MULTIPLE_ITEMS');
    }

    case 'REORDER_ITEMS': {
      const { fromIndex, toIndex, count = 1 } = action.payload;
      const items = [...state.items];
      const movedItems = items.splice(fromIndex, count);
      items.splice(toIndex, 0, ...movedItems);
      return markChanged({ items: clearHeaderNumbers(items) }, 'REORDER_ITEMS');
    }

    case 'SET_COLUMNS': {
      // Columns are user-specific presentation; do not mark content as dirty
      debugLogger.grid('SET_COLUMNS applied (no content change) - count:', action.payload?.length ?? 0);
      return { ...state, columns: action.payload };
    }

    case 'UPDATE_COLUMN': {
      const columns = state.columns.map(col =>
        col.id === action.payload.id
          ? { ...col, ...action.payload.updates }
          : col
      );
      // Column tweak shouldn't flip hasUnsavedChanges
      debugLogger.grid('UPDATE_COLUMN applied (no content change) - id:', action.payload.id);
      return { ...state, columns };
    }

    case 'SET_TITLE':
      return markChanged({ title: action.payload }, 'SET_TITLE');

    case 'SET_START_TIME':
      // START_TIME is UI preference, not content - don't mark as changed
      debugLogger.autosave('SET_START_TIME applied (UI preference) - no content change flagged');
      return { ...state, startTime: action.payload };

    case 'SET_TIMEZONE':
      // TIMEZONE is UI preference, not content - don't mark as changed
      debugLogger.autosave('SET_TIMEZONE applied (UI preference) - no content change flagged');
      return { ...state, timezone: action.payload };
      
    case 'SET_SHOW_DATE':
      return markChanged({ showDate: action.payload }, 'SET_SHOW_DATE');

    case 'SET_EXTERNAL_NOTES':
      return markChanged({ externalNotes: action.payload }, 'SET_EXTERNAL_NOTES');

    case 'SET_CURRENT_SEGMENT':
      return { ...state, currentSegmentId: action.payload };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'MARK_SAVED':
      console.log('✅ MARKED AS SAVED: hasUnsavedChanges=false', {
        previousState: state.hasUnsavedChanges,
        reason: 'Save operation completed'
      });
      return { ...state, hasUnsavedChanges: false };

    case 'SET_DOC_VERSION':
      return { ...state, docVersion: action.payload };

    case 'LOAD_STATE': {
      debugLogger.autosave('LOAD_STATE applied; resetting hasUnsavedChanges=false');
      return {
        ...state,
        ...action.payload,
        hasUnsavedChanges: false,
        lastChanged: 0
      };
    }

    case 'LOAD_REMOTE_STATE': {
      debugLogger.autosave('LOAD_REMOTE_STATE applied; keeping hasUnsavedChanges=false, no lastChanged update');
      return {
        ...state,
        ...action.payload,
        hasUnsavedChanges: false, // Remote updates should never trigger saves
        // Don't update lastChanged for remote updates
      };
    }
    default:
      return state;
  }
}

// Helper function to clear header row numbers
function clearHeaderNumbers(items: RundownItem[]): RundownItem[] {
  return items.map(item => {
    if (isHeaderItem(item)) {
      return { ...item, rowNumber: '' };
    }
    return item;
  });
}

export const useRundownState = (initialData?: Partial<RundownState>, rundownId?: string) => {
  const [state, dispatch] = useReducer(rundownReducer, {
    ...initialState,
    ...initialData
  });

  // Set up live broadcast for real-time updates
  const { broadcastLiveUpdate } = useRundownBroadcast({
    rundownId: rundownId || '',
    enabled: !!rundownId,
    isSharedView: false
  });

  // OPTIMIZED: Granular calculations - only recalculate what actually changed
  const calculations = useMemo(() => {
    const timeToSeconds = (timeStr: string | null | undefined) => {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const str = timeStr.trim();
      if (!str) return 0;
      const parts = str.split(':').map((p) => Number(p || 0));
      if (parts.length === 2) {
        const [minutes = 0, seconds = 0] = parts;
        return (minutes || 0) * 60 + (seconds || 0);
      } else if (parts.length === 3) {
        const [hours = 0, minutes = 0, seconds = 0] = parts;
        return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
      }
      return 0;
    };

    const secondsToTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return { timeToSeconds, secondsToTime };
  }, []); // No dependencies - these are pure utility functions

  // OPTIMIZED: Lazy calculation of timing-dependent values
  const itemsWithCalculatedTimes = useMemo(() => {
    let currentTime = state.startTime;
    return state.items.map((item, index) => {
      const startTime = currentTime;
      let endTime = currentTime;
      
      if (!isHeaderItem(item)) {
        const durationSeconds = calculations.timeToSeconds(item.duration || '00:00');
        const startSeconds = calculations.timeToSeconds(currentTime);
        endTime = calculations.secondsToTime(startSeconds + durationSeconds);
        
        // Only advance timeline for non-floated items
        if (!item.isFloating && !item.isFloated) {
          currentTime = endTime;
        }
      }

      const elapsedSeconds = calculations.timeToSeconds(startTime) - calculations.timeToSeconds(state.startTime);
      const elapsedTime = calculations.secondsToTime(Math.max(0, elapsedSeconds));

      return {
        ...item,
        startTime,
        endTime,
        elapsedTime
      };
    });
  }, [state.items, state.startTime, calculations]); // Only recalculate when items or startTime change

  // OPTIMIZED: Lazy calculation of row numbers
  const itemsWithRowNumbers = useMemo(() => {
    // This is used when useRundownState is used standalone (not in main rundown)
    // For main rundown, calculateItemsWithTiming handles row numbering
    let regularRowCount = 0;
    return itemsWithCalculatedTimes.map((item) => {
      if (isHeaderItem(item)) {
        return { ...item, rowNumber: item.rowNumber || '' };
      }
      
      // Use existing rowNumber if it exists and is not empty (preserves drag operation results)
      // Otherwise assign sequential number for new items
      if (item.rowNumber && item.rowNumber.trim() !== '') {
        return { ...item };
      } else {
        regularRowCount++;
        return { ...item, rowNumber: regularRowCount.toString() };
      }
    });
  }, [itemsWithCalculatedTimes]);

  // OPTIMIZED: Lazy calculation of totals
  const totalRuntime = useMemo(() => {
    const totalSeconds = state.items.reduce((acc, item) => {
      if (isHeaderItem(item) || item.isFloating || item.isFloated) return acc;
      return acc + calculations.timeToSeconds(item.duration || '00:00');
    }, 0);
    return calculations.secondsToTime(totalSeconds);
  }, [state.items, calculations]); // Only recalculate when items change

  // OPTIMIZED: Lazy calculation of header durations
  const headerDurations = useMemo(() => {
    const durations = new Map<string, string>();
    state.items.forEach((item, index) => {
      if (isHeaderItem(item)) {
        let segmentSeconds = 0;
        for (let i = index + 1; i < state.items.length; i++) {
          const nextItem = state.items[i];
          if (isHeaderItem(nextItem)) break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            segmentSeconds += calculations.timeToSeconds(nextItem.duration || '00:00');
          }
        }
        durations.set(item.id, calculations.secondsToTime(segmentSeconds));
      }
    });
    return durations;
  }, [state.items, calculations]); // Only recalculate when items change

  // OPTIMIZED: Action creators with granular broadcast
  const actions = useMemo(() => ({
    setItems: (items: RundownItem[]) => {
      dispatch({ type: 'SET_ITEMS', payload: items });
      if (rundownId) {
        broadcastLiveUpdate('live_state', { items });
      }
    },
    
    updateItem: (id: string, updates: Partial<RundownItem>) => {
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
      if (rundownId) {
        // OPTIMIZED: Only broadcast the specific change, not entire items array
        const updatedItems = state.items.map(i => (i.id === id ? { ...i, ...updates } : i));
        broadcastLiveUpdate('live_typing', { items: updatedItems });
      }
    },
    
    addItem: (item: RundownItem, insertIndex?: number) => {
      dispatch({ type: 'ADD_ITEM', payload: { item, insertIndex } });
      if (rundownId) {
        setTimeout(() => {
          broadcastLiveUpdate('live_state', { items: state.items });
        }, 0);
      }
    },
    
    deleteItem: (id: string) => {
      dispatch({ type: 'DELETE_ITEM', payload: id });
      if (rundownId) {
        setTimeout(() => {
          broadcastLiveUpdate('live_state', { items: state.items });
        }, 0);
      }
    },
    
    deleteMultipleItems: (ids: string[]) => {
      dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: ids });
      if (rundownId) {
        setTimeout(() => {
          broadcastLiveUpdate('live_state', { items: state.items });
        }, 0);
      }
    },
    
    reorderItems: (fromIndex: number, toIndex: number, count?: number) => {
      dispatch({ type: 'REORDER_ITEMS', payload: { fromIndex, toIndex, count } });
      if (rundownId) {
        setTimeout(() => {
          broadcastLiveUpdate('live_state', { items: state.items });
        }, 0);
      }
    },
    
    setColumns: (columns: Column[]) => dispatch({ type: 'SET_COLUMNS', payload: columns }),
    
    updateColumn: (id: string, updates: Partial<Column>) =>
      dispatch({ type: 'UPDATE_COLUMN', payload: { id, updates } }),
    
    setTitle: (title: string) => {
      dispatch({ type: 'SET_TITLE', payload: title });
      if (rundownId) {
        broadcastLiveUpdate('live_typing', { title });
      }
    },
    
    setStartTime: (startTime: string) => {
      dispatch({ type: 'SET_START_TIME', payload: startTime });
      if (rundownId) {
        broadcastLiveUpdate('live_typing', { startTime });
      }
    },
    
    setTimezone: (timezone: string) => {
      dispatch({ type: 'SET_TIMEZONE', payload: timezone });
      if (rundownId) {
        broadcastLiveUpdate('live_typing', { timezone });
      }
    },

    setShowDate: (showDate: Date | null) => dispatch({ type: 'SET_SHOW_DATE', payload: showDate }),
    
    setExternalNotes: (externalNotes: any) => dispatch({ type: 'SET_EXTERNAL_NOTES', payload: externalNotes }),
    
    setCurrentSegment: (id: string | null) => dispatch({ type: 'SET_CURRENT_SEGMENT', payload: id }),
    
    setPlaying: (playing: boolean) => dispatch({ type: 'SET_PLAYING', payload: playing }),
    
    markSaved: () => dispatch({ type: 'MARK_SAVED' }),
    
    setDocVersion: (version: number) => dispatch({ type: 'SET_DOC_VERSION', payload: version }),
    
    loadState: (newState: Partial<RundownState>) => dispatch({ type: 'LOAD_STATE', payload: newState }),
    
    loadRemoteState: (newState: Partial<RundownState>) => dispatch({ type: 'LOAD_REMOTE_STATE', payload: newState })
  }), [state.items, rundownId, broadcastLiveUpdate]);

  // Helper functions for common operations
  const helpers = useMemo(() => ({
    addRow: (insertIndex?: number) => {
      const newItem: RundownItem = {
        id: uuidv4(),
        type: 'regular',
        rowNumber: '',
        name: RUNDOWN_DEFAULTS.DEFAULT_ROW_NAME,
        startTime: '',
        duration: RUNDOWN_DEFAULTS.NEW_ROW_DURATION, // Using constant
        endTime: '',
        elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
        isFloating: false
      };
      actions.addItem(newItem, insertIndex);
    },

    addHeader: (insertIndex?: number) => {
      const newItem: RundownItem = {
        id: uuidv4(),
        type: 'header',
        rowNumber: 'A',
        name: RUNDOWN_DEFAULTS.DEFAULT_HEADER_NAME,
        startTime: '',
        duration: RUNDOWN_DEFAULTS.NEW_HEADER_DURATION,
        endTime: '',
        elapsedTime: RUNDOWN_DEFAULTS.DEFAULT_ELAPSED_TIME,
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: RUNDOWN_DEFAULTS.DEFAULT_COLOR,
        isFloating: false
      };
      actions.addItem(newItem, insertIndex);
    },

    toggleFloat: (id: string) => {
      const item = state.items.find(i => i.id === id);
      if (item) {
        actions.updateItem(id, { isFloating: !item.isFloating });
      }
    },

    getRowNumber: (index: number) => {
      const item = itemsWithRowNumbers[index];
      return item?.rowNumber || '';
    },

    getHeaderDuration: (id: string) => {
      return headerDurations.get(id) || '00:00:00';
    }
  }), [state.items, actions, calculations]);

  return {
    state,
    calculations: {
      itemsWithCalculatedTimes: itemsWithRowNumbers,
      totalRuntime,
      headerDurations,
      timeToSeconds: calculations.timeToSeconds,
      secondsToTime: calculations.secondsToTime
    },
    actions,
    helpers
  };
};
