import { useReducer, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { v4 as uuidv4 } from 'uuid';
import { RUNDOWN_DEFAULTS } from '@/constants/rundownDefaults';

export interface RundownState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  startTime: string;
  timezone: string;
  currentSegmentId: string | null;
  isPlaying: boolean;
  hasUnsavedChanges: boolean;
  lastChanged: number;
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
  | { type: 'SET_CURRENT_SEGMENT'; payload: string | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'LOAD_STATE'; payload: Partial<RundownState> };

const initialState: RundownState = {
  items: [],
  columns: [],
  title: RUNDOWN_DEFAULTS.DEFAULT_RUNDOWN_TITLE,
  startTime: RUNDOWN_DEFAULTS.DEFAULT_START_TIME,
  timezone: RUNDOWN_DEFAULTS.DEFAULT_TIMEZONE,
  currentSegmentId: null,
  isPlaying: false,
  hasUnsavedChanges: false,
  lastChanged: 0
};

function rundownReducer(state: RundownState, action: RundownAction): RundownState {
  const markChanged = (newState: Partial<RundownState>) => ({
    ...state,
    ...newState,
    hasUnsavedChanges: true,
    lastChanged: Date.now()
  });

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
      return markChanged({ items: renumberHeaders(items) });
    }

    case 'DELETE_ITEM': {
      const items = state.items.filter(item => item.id !== action.payload);
      return markChanged({ items: renumberHeaders(items) });
    }

    case 'DELETE_MULTIPLE_ITEMS': {
      const items = state.items.filter(item => !action.payload.includes(item.id));
      return markChanged({ items: renumberHeaders(items) });
    }

    case 'REORDER_ITEMS': {
      const { fromIndex, toIndex, count = 1 } = action.payload;
      const items = [...state.items];
      const movedItems = items.splice(fromIndex, count);
      items.splice(toIndex, 0, ...movedItems);
      return markChanged({ items: renumberHeaders(items) });
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

    case 'SET_CURRENT_SEGMENT':
      return { ...state, currentSegmentId: action.payload };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };

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

// Helper function to renumber headers sequentially
function renumberHeaders(items: RundownItem[]): RundownItem[] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let headerIndex = 0;
  
  return items.map(item => {
    if (isHeaderItem(item)) {
      const letter = letters[headerIndex] || 'A';
      headerIndex++;
      return { ...item, rowNumber: letter, segmentName: letter };
    }
    return item;
  });
}

export const useRundownState = (initialData?: Partial<RundownState>) => {
  const [state, dispatch] = useReducer(rundownReducer, {
    ...initialState,
    ...initialData
  });

  // Pure calculation functions (no side effects)
  const calculations = useMemo(() => {
    const timeToSeconds = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
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

    // Calculate row numbers
    const itemsWithRowNumbers = itemsWithCalculatedTimes.map((item, index) => {
      if (isHeaderItem(item)) {
        return item; // Headers already have their rowNumber set
      }

      // Find current segment for regular items
      let currentSegment = 'A';
      let itemCountInSegment = 0;

      for (let i = 0; i <= index; i++) {
        const currentItem = itemsWithCalculatedTimes[i];
        if (isHeaderItem(currentItem)) {
          currentSegment = currentItem.rowNumber || 'A';
          itemCountInSegment = 0;
        } else {
          itemCountInSegment++;
        }
      }

      return {
        ...item,
        rowNumber: `${currentSegment}${itemCountInSegment}`
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

  // Action creators
  const actions = useMemo(() => ({
    setItems: (items: RundownItem[]) => dispatch({ type: 'SET_ITEMS', payload: items }),
    
    updateItem: (id: string, updates: Partial<RundownItem>) => 
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } }),
    
    addItem: (item: RundownItem, insertIndex?: number) =>
      dispatch({ type: 'ADD_ITEM', payload: { item, insertIndex } }),
    
    deleteItem: (id: string) => dispatch({ type: 'DELETE_ITEM', payload: id }),
    
    deleteMultipleItems: (ids: string[]) => 
      dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: ids }),
    
    reorderItems: (fromIndex: number, toIndex: number, count?: number) =>
      dispatch({ type: 'REORDER_ITEMS', payload: { fromIndex, toIndex, count } }),
    
    setColumns: (columns: Column[]) => dispatch({ type: 'SET_COLUMNS', payload: columns }),
    
    updateColumn: (id: string, updates: Partial<Column>) =>
      dispatch({ type: 'UPDATE_COLUMN', payload: { id, updates } }),
    
    setTitle: (title: string) => dispatch({ type: 'SET_TITLE', payload: title }),
    
    setStartTime: (startTime: string) => dispatch({ type: 'SET_START_TIME', payload: startTime }),
    
    setTimezone: (timezone: string) => dispatch({ type: 'SET_TIMEZONE', payload: timezone }),
    
    setCurrentSegment: (id: string | null) => dispatch({ type: 'SET_CURRENT_SEGMENT', payload: id }),
    
    setPlaying: (playing: boolean) => dispatch({ type: 'SET_PLAYING', payload: playing }),
    
    markSaved: () => dispatch({ type: 'MARK_SAVED' }),
    
    loadState: (newState: Partial<RundownState>) => dispatch({ type: 'LOAD_STATE', payload: newState })
  }), []);

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
