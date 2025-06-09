
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
  const isSavingHistory = useRef(false);
  const lastSavedHistoryRef = useRef<string>('');
  const saveTimeout = useRef<NodeJS.Timeout>();

  // Load undo history when rundown is loaded
  const loadUndoHistory = useCallback((history: UndoState[] = []) => {
    setUndoStack(history.slice(-10)); // Keep fewer states since we're saving less frequently
  }, []);

  // Save undo history to database
  const saveUndoHistoryToDatabase = useCallback(async (newStack: UndoState[]) => {
    if (!props?.rundownId || !props.updateRundown || isSavingHistory.current) return;
    if (!props.currentTitle || !props.currentItems || !props.currentColumns) return;
    
    const historyKey = JSON.stringify(newStack);
    if (lastSavedHistoryRef.current === historyKey) return;
    
    try {
      isSavingHistory.current = true;
      lastSavedHistoryRef.current = historyKey;
      
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
      lastSavedHistoryRef.current = '';
    } finally {
      isSavingHistory.current = false;
    }
  }, [props?.rundownId, props?.updateRundown, props?.currentTitle, props?.currentItems, props?.currentColumns]);

  // Save state when auto-save occurs or on significant operations
  const saveStateOnSave = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string = 'Auto-save'
  ) => {
    if (isUndoing.current || isSavingHistory.current) return;

    console.log('Saving undo state on save:', action);

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)),
      columns: JSON.parse(JSON.stringify(columns)),
      title,
      action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, newState];
      const trimmedStack = newStack.slice(-10); // Keep only last 10 states
      
      // Clear any existing timeout
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      
      // Save to database
      if (props?.rundownId && props?.updateRundown) {
        saveTimeout.current = setTimeout(() => {
          saveUndoHistoryToDatabase(trimmedStack);
        }, 1000);
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
      console.log('No undo states available');
      return null;
    }

    const lastState = undoStack[undoStack.length - 1];
    console.log('Undoing to state:', lastState.action);
    
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
    
    // Reset the undoing flag
    setTimeout(() => {
      isUndoing.current = false;
      console.log('Undo operation completed');
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

  const canUndo = undoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null;

  return {
    saveStateOnSave, // New function for saving state on auto-save
    undo,
    canUndo,
    lastAction,
    loadUndoHistory
  };
};
