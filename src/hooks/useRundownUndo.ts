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
}

export const useRundownUndo = (props?: UseRundownUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);
  const isSavingHistory = useRef(false);

  // Load undo history when rundown is loaded
  const loadUndoHistory = useCallback((history: UndoState[] = []) => {
    setUndoStack(history.slice(-10)); // Keep only last 10 states
  }, []);

  // Save undo history to database
  const saveUndoHistoryToDatabase = useCallback(async (newStack: UndoState[]) => {
    if (!props?.rundownId || !props.updateRundown || isSavingHistory.current) return;
    
    try {
      isSavingHistory.current = true;
      // Get the current rundown state (we need all fields for the update)
      // We'll pass the undo history as a separate parameter
      await props.updateRundown(
        props.rundownId,
        newStack[newStack.length - 1]?.title || 'Untitled Rundown',
        newStack[newStack.length - 1]?.items || [],
        true, // silent update
        false, // not archived
        newStack[newStack.length - 1]?.columns,
        undefined, // timezone - keep existing
        undefined, // startTime - keep existing
        undefined, // icon - keep existing
        newStack // pass undo history
      );
    } catch (error) {
      console.error('Failed to save undo history:', error);
    } finally {
      isSavingHistory.current = false;
    }
  }, [props?.rundownId, props?.updateRundown]);

  const saveState = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string
  ) => {
    // Don't save state during undo operations or when saving history
    if (isUndoing.current || isSavingHistory.current) return;

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)), // Deep clone
      columns: JSON.parse(JSON.stringify(columns)), // Deep clone
      title,
      action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, newState];
      // Keep only last 10 states to prevent memory issues
      const trimmedStack = newStack.slice(-10);
      
      // Save to database asynchronously
      if (props?.rundownId && props?.updateRundown) {
        // Use a small delay to batch rapid changes
        setTimeout(() => saveUndoHistoryToDatabase(trimmedStack), 500);
      }
      
      return trimmedStack;
    });
  }, [saveUndoHistoryToDatabase, props?.rundownId, props?.updateRundown]);

  const undo = useCallback((
    setItems: (items: RundownItem[]) => void,
    setColumns: (columns: Column[]) => void,
    setTitle: (title: string) => void
  ) => {
    if (undoStack.length === 0) return null;

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
    
    // Save updated history to database
    if (props?.rundownId && props?.updateRundown) {
      saveUndoHistoryToDatabase(newStack);
    }
    
    // Reset the undoing flag after a short delay
    setTimeout(() => {
      isUndoing.current = false;
    }, 100);

    return lastState.action;
  }, [undoStack, saveUndoHistoryToDatabase, props?.rundownId, props?.updateRundown]);

  const canUndo = undoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null;

  return {
    saveState,
    undo,
    canUndo,
    lastAction,
    loadUndoHistory
  };
};
