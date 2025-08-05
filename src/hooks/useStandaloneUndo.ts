import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface UndoState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  action: string;
  timestamp: number;
}

interface UseStandaloneUndoProps {
  onUndo: (items: RundownItem[], columns: Column[], title: string) => void;
  setUndoActive?: (active: boolean) => void;
}

export const useStandaloneUndo = ({ onUndo, setUndoActive }: UseStandaloneUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);
  const isRedoing = useRef(false);
  const lastStateSignature = useRef<string>('');
  const currentState = useRef<{ items: RundownItem[], columns: Column[], title: string } | null>(null);

  // Save a state snapshot for undo
  const saveState = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string
  ) => {
    // Don't save during undo/redo operations
    if (isUndoing.current || isRedoing.current) {
      return;
    }
    
    // Store current state for redo functionality
    currentState.current = { items, columns, title };
    
    // Clear redo stack when new state is saved
    if (redoStack.length > 0) {
      setRedoStack([]);
    }

    // Create a signature to avoid duplicate saves
    const currentSignature = JSON.stringify({ items, columns, title });
    if (lastStateSignature.current === currentSignature) {
      return;
    }

    console.log('📝 Saving undo state for action:', action);
    lastStateSignature.current = currentSignature;

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)), // Deep clone
      columns: JSON.parse(JSON.stringify(columns)), // Deep clone
      title,
      action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [...prev, newState];
      // Keep only last 20 states
      return newStack.slice(-20);
    });
  }, []);

  // Perform undo operation
  const undo = useCallback(() => {
    if (undoStack.length === 0) {
      console.log('No undo states available');
      return null;
    }

    const lastState = undoStack[undoStack.length - 1];
    console.log('⏪ Undoing action:', lastState.action);
    
    // Mark that we're undoing to prevent saving this as a new state
    isUndoing.current = true;
    
    // Notify autosave that undo is active
    if (setUndoActive) {
      setUndoActive(true);
    }
    
    // Add current state to redo stack before undoing
    if (currentState.current) {
      const redoState: UndoState = {
        items: JSON.parse(JSON.stringify(currentState.current.items)),
        columns: JSON.parse(JSON.stringify(currentState.current.columns)),
        title: currentState.current.title,
        action: 'Before undo',
        timestamp: Date.now()
      };
      setRedoStack(prev => [...prev, redoState].slice(-20));
    }
    
    // Clear the last state signature to allow the restored state to be saved again if needed
    lastStateSignature.current = '';
    
    // Restore the previous state
    onUndo(lastState.items, lastState.columns, lastState.title);
    
    // Remove the last state from the stack
    setUndoStack(prev => prev.slice(0, -1));
    
    // Reset flags after operation completes
    setTimeout(() => {
      isUndoing.current = false;
      if (setUndoActive) {
        setUndoActive(false);
      }
      console.log('⏪ Undo operation completed');
    }, 1000);

    return lastState.action;
  }, [undoStack, onUndo, setUndoActive]);

  // Perform redo operation
  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      console.log('No redo states available');
      return null;
    }

    const nextState = redoStack[redoStack.length - 1];
    console.log('⏩ Redoing action:', nextState.action);
    
    // Mark that we're redoing to prevent saving this as a new state
    isRedoing.current = true;
    
    // Notify autosave that redo is active
    if (setUndoActive) {
      setUndoActive(true);
    }
    
    // Add current state to undo stack before redoing
    if (currentState.current) {
      const undoState: UndoState = {
        items: JSON.parse(JSON.stringify(currentState.current.items)),
        columns: JSON.parse(JSON.stringify(currentState.current.columns)),
        title: currentState.current.title,
        action: 'Before redo',
        timestamp: Date.now()
      };
      setUndoStack(prev => [...prev, undoState].slice(-20));
    }
    
    // Clear the last state signature to allow the restored state to be saved again if needed
    lastStateSignature.current = '';
    
    // Restore the next state
    onUndo(nextState.items, nextState.columns, nextState.title);
    
    // Remove the state from redo stack
    setRedoStack(prev => prev.slice(0, -1));
    
    // Reset flags after operation completes
    setTimeout(() => {
      isRedoing.current = false;
      if (setUndoActive) {
        setUndoActive(false);
      }
      console.log('⏩ Redo operation completed');
    }, 1000);

    return nextState.action;
  }, [redoStack, onUndo, setUndoActive]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].action : null;
  const nextAction = redoStack.length > 0 ? redoStack[redoStack.length - 1].action : null;

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction,
    nextAction
  };
};
