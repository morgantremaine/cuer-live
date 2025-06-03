import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface UndoState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  action: string;
  timestamp: number;
}

export const useRundownUndo = () => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);

  const saveState = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string
  ) => {
    // Don't save state during undo operations
    if (isUndoing.current) return;

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
      return newStack.slice(-10);
    });
  }, []);

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
    setUndoStack(prev => prev.slice(0, -1));
    
    // Reset the undoing flag after a short delay
    setTimeout(() => {
      isUndoing.current = false;
    }, 100);

    return lastState.action;
  }, [undoStack]);

  const canUndo = undoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null;

  return {
    saveState,
    undo,
    canUndo,
    lastAction
  };
};
