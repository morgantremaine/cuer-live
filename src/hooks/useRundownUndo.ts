import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface UndoState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  action: string;
  timestamp: number;
}

interface UseRundownUndoProps {
  rundownId?: string;
  updateRundown?: (id: string, title: string, items: RundownItem[], silent?: boolean, archived?: boolean, columns?: Column[], timezone?: string, startTime?: string, icon?: string, undoHistory?: UndoState[]) => Promise<void>;
  currentTitle?: string;
  currentItems?: RundownItem[];
  currentColumns?: Column[];
}

export const useRundownUndo = (props?: UseRundownUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);
  const saveTimeout = useRef<NodeJS.Timeout>();

  // Load undo history when rundown is loaded
  const loadUndoHistory = useCallback((history: UndoState[] = []) => {
    setUndoStack(history.slice(-10)); // Keep fewer states to reduce conflicts
  }, []);

  // Save undo history to database with debouncing
  const saveUndoHistoryToDatabase = useCallback(async (newStack: UndoState[]) => {
    if (!props?.rundownId || !props.updateRundown || isUndoing.current) return;
    if (!props.currentTitle || !props.currentItems || !props.currentColumns) return;
    
    try {
      await props.updateRundown(
        props.rundownId,
        props.currentTitle,
        props.currentItems,
        true, // silent update
        false, // not archived
        props.currentColumns,
        undefined, // timezone - keep existing
        undefined, // startTime - keep existing
        undefined, // icon - keep existing
        newStack // pass undo history
      );
    } catch (error) {
      console.error('Failed to save undo history:', error);
    }
  }, [props?.rundownId, props?.updateRundown, props?.currentTitle, props?.currentItems, props?.currentColumns]);

  const saveStateOnSave = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string
  ) => {
    // Don't save state during undo operations
    if (isUndoing.current) {
      return;
    }

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)), // Deep clone
      columns: JSON.parse(JSON.stringify(columns)), // Deep clone
      title,
      action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, newState];
      // Keep only last 10 states
      const trimmedStack = newStack.slice(-10);
      
      // Clear any existing timeout
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      
      // Save to database with delay to batch updates
      if (props?.rundownId && props?.updateRundown) {
        saveTimeout.current = setTimeout(() => {
          saveUndoHistoryToDatabase(trimmedStack);
        }, 3000); // Delay to reduce save frequency
      }
      
      return trimmedStack;
    });
  }, [saveUndoHistoryToDatabase, props?.rundownId, props?.updateRundown]);

  const undo = useCallback((
    setItems: (items: RundownItem[]) => void,
    setColumns: (columns: Column[]) => void,
    setTitle: (title: string) => void
  ) => {
    if (undoStack.length === 0) {
      return null;
    }

    const lastState = undoStack[undoStack.length - 1];
    
    // Mark that we're undoing to prevent saving this as a new state
    isUndoing.current = true;
    
    // Restore the previous state
    setItems(lastState.items);
    setColumns(lastState.columns);
    setTitle(lastState.title);
    
    // Remove the last state from the stack
    const newStack = undoStack.slice(0, -1);
    setUndoStack(newStack);
    
    // Clear any existing timeout
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    
    // Save updated history to database
    if (props?.rundownId && props?.updateRundown) {
      saveTimeout.current = setTimeout(() => {
        saveUndoHistoryToDatabase(newStack);
      }, 1000);
    }
    
    // Reset the undoing flag after a delay
    setTimeout(() => {
      isUndoing.current = false;
    }, 500);

    return lastState.action;
  }, [undoStack, saveUndoHistoryToDatabase, props?.rundownId, props?.updateRundown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  const canUndo = undoStack.length > 0 && !isUndoing.current;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null;

  return {
    saveStateOnSave,
    undo,
    canUndo,
    lastAction,
    loadUndoHistory
  };
};
