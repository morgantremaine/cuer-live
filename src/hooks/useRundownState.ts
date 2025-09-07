
import { useReducer, useCallback, useMemo } from 'react';
import { useRundownBroadcast } from './useRundownBroadcast';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

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
  | { type: 'LOAD_STATE'; payload: Partial<RundownState> };

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
  const markChanged = (newState: Partial<RundownState>) => {
    return {
      ...state,
      ...newState,
      hasUnsavedChanges: true,
      lastChanged: Date.now()
    };
  };

  switch (action.type) {
    case 'SET_ITEMS':
      return markChanged({ items: action.payload });

    case 'UPDATE_ITEM': {
      const items = state.items.map(item =>
        item.id === action.payload.id 
          ? { ...item, ...action.payload.updates }
          : item
      );
      return markChanged({ items });
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
      return markChanged({ items: clearHeaderNumbers(items) });
    }

    case 'DELETE_ITEM': {
      const items = state.items.filter(item => item.id !== action.payload);
      return markChanged({ items: clearHeaderNumbers(items) });
    }

    case 'DELETE_MULTIPLE_ITEMS': {
      const items = state.items.filter(item => !action.payload.includes(item.id));
      return markChanged({ items: clearHeaderNumbers(items) });
    }

    case 'REORDER_ITEMS': {
      const { fromIndex, toIndex, count = 1 } = action.payload;
      const items = [...state.items];
      const movedItems = items.splice(fromIndex, count);
      items.splice(toIndex, 0, ...movedItems);
      return markChanged({ items: clearHeaderNumbers(items) });
    }

    case 'SET_COLUMNS':
      return markChanged({ columns: action.payload });

    case 'UPDATE_COLUMN': {
      const columns = state.columns.map(col =>
        col.id === action.payload.id
          ? { ...col, ...action.payload.updates }
          : col
      );
      return markChanged({ columns });
    }

    case 'SET_TITLE':
      return markChanged({ title: action.payload });

    case 'SET_START_TIME':
      return markChanged({ startTime: action.payload });

    case 'SET_TIMEZONE':
      return markChanged({ timezone: action.payload });

    case 'SET_SHOW_DATE':
      return markChanged({ showDate: action.payload });
      
    case 'SET_EXTERNAL_NOTES':
      return markChanged({ externalNotes: action.payload });

    case 'SET_CURRENT_SEGMENT':
      return { ...state, currentSegmentId: action.payload };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };

    case 'SET_DOC_VERSION':
      return { ...state, docVersion: action.payload };

    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
        hasUnsavedChanges: false,
        lastChanged: 0
      };

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

  // Pure calculation functions (no side effects)
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

    // Calculate all derived values
    let currentTime = state.startTime;
    const itemsWithCalculatedTimes = state.items.map((item, index) => {
      const startTime = currentTime;
      let endTime = currentTime;
      
      if (!isHeaderItem(item)) {
        const durationSeconds = timeToSeconds(item.duration || '00:00');
        const startSeconds = timeToSeconds(currentTime);
        endTime = secondsToTime(startSeconds + durationSeconds);
        
        // Only advance timeline for non-floated items
        if (!item.isFloating && !item.isFloated) {
          currentTime = endTime;
        }
      }

      const elapsedSeconds = timeToSeconds(startTime) - timeToSeconds(state.startTime);
      const elapsedTime = secondsToTime(Math.max(0, elapsedSeconds));

      return {
        ...item,
        startTime,
        endTime,
        elapsedTime
      };
    });

    // Calculate row numbers - headers get empty, regular items get sequential numbers
    let regularRowCount = 0;
    const itemsWithRowNumbers = itemsWithCalculatedTimes.map((item, index) => {
      if (isHeaderItem(item)) {
        return { ...item, rowNumber: '' }; // Headers don't have numbers
      }

      // Sequential numbering for regular items
      regularRowCount++;
      return {
        ...item,
        rowNumber: regularRowCount.toString()
      };
    });

    // Calculate total runtime (excluding floated items)
    const totalSeconds = state.items.reduce((acc, item) => {
      if (isHeaderItem(item) || item.isFloating || item.isFloated) return acc;
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);

    const totalRuntime = secondsToTime(totalSeconds);

    // Calculate header durations
    const headerDurations = new Map<string, string>();
    state.items.forEach((item, index) => {
      if (isHeaderItem(item)) {
        let segmentSeconds = 0;
        for (let i = index + 1; i < state.items.length; i++) {
          const nextItem = state.items[i];
          if (isHeaderItem(nextItem)) break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            segmentSeconds += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        headerDurations.set(item.id, secondsToTime(segmentSeconds));
      }
    });

    return {
      itemsWithCalculatedTimes: itemsWithRowNumbers,
      totalRuntime,
      headerDurations,
      timeToSeconds,
      secondsToTime
    };
  }, [state.items, state.startTime]);

  // Action creators with live broadcast
  const actions = useMemo(() => ({
    setItems: (items: RundownItem[]) => {
      dispatch({ type: 'SET_ITEMS', payload: items });
      if (rundownId) {
        broadcastLiveUpdate('live_state', { items });
      }
    },
    
    updateItem: (id: string, updates: Partial<RundownItem>) => {
      // Compute next items so the broadcast includes the latest change (fixes shared view lag for color/float)
      const updatedItems = state.items.map(i => (i.id === id ? { ...i, ...updates } : i));
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } });
      if (rundownId) {
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
    
    loadState: (newState: Partial<RundownState>) => dispatch({ type: 'LOAD_STATE', payload: newState })
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
      const item = calculations.itemsWithCalculatedTimes[index];
      return item?.rowNumber || '';
    },

    getHeaderDuration: (id: string) => {
      return calculations.headerDurations.get(id) || '00:00:00';
    }
  }), [state.items, actions, calculations]);

  return {
    state,
    calculations,
    actions,
    helpers
  };
};
