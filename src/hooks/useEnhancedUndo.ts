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

interface UseEnhancedUndoProps {
  rundownId?: string | null;
  currentTitle: string;
  currentItems: RundownItem[];
  currentColumns: Column[];
}

const STORAGE_KEY = 'rundown_undo_history';
const MAX_UNDO_STATES = 10;

export const useEnhancedUndo = ({
  rundownId,
  currentTitle,
  currentItems,
  currentColumns
}: UseEnhancedUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);
  const lastStateSignature = useRef<string>('');

  // Load undo history from localStorage on mount
  useEffect(() => {
    if (!rundownId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${rundownId}`);
      if (stored) {
        const history: UndoState[] = JSON.parse(stored);
        setUndoStack(history.slice(-MAX_UNDO_STATES));
      }
    } catch (error) {
      console.error('Failed to load undo history:', error);
    }
  }, [rundownId]);

  // Save undo history to localStorage whenever it changes
  useEffect(() => {
    if (!rundownId || undoStack.length === 0) return;
    
    try {
      localStorage.setItem(`${STORAGE_KEY}_${rundownId}`, JSON.stringify(undoStack));
    } catch (error) {
      console.error('Failed to save undo history:', error);
    }
  }, [rundownId, undoStack]);

  const saveState = useCallback((action: string) => {
    if (isUndoing.current) {
      console.log('Skipping undo state save during undo operation');
      return;
    }

    // Create a signature for the current state to avoid duplicate saves
    const currentSignature = JSON.stringify({ 
      items: currentItems, 
      columns: currentColumns, 
      title: currentTitle 
    });
    
    if (lastStateSignature.current === currentSignature) {
      console.log('Skipping duplicate state save for action:', action);
      return;
    }

    console.log('Saving undo state for action:', action);
    lastStateSignature.current = currentSignature;

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(currentItems)), // Deep clone
      columns: JSON.parse(JSON.stringify(currentColumns)), // Deep clone
      title: currentTitle,
      action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      // Don't add if the last state is identical
      if (prev.length > 0) {
        const lastState = prev[prev.length - 1];
        const lastSignature = JSON.stringify({ 
          items: lastState.items, 
          columns: lastState.columns, 
          title: lastState.title 
        });
        if (lastSignature === currentSignature) {
          console.log('Skipping identical state save');
          return prev;
        }
      }

      const newStack = [...prev, newState];
      // Keep only last MAX_UNDO_STATES states
      return newStack.slice(-MAX_UNDO_STATES);
    });
  }, [currentItems, currentColumns, currentTitle]);

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
    console.log('Undoing action:', lastState.action);
    
    // Mark that we're undoing to prevent saving this as a new state
    isUndoing.current = true;
    
    // Clear the last state signature to allow the restored state to be saved again if needed
    lastStateSignature.current = '';
    
    // Restore the previous state
    setItems(lastState.items);
    setColumns(lastState.columns);
    setTitle(lastState.title);
    
    // Remove the last state from the stack
    setUndoStack(prev => prev.slice(0, -1));
    
    // Reset the undoing flag after a delay
    setTimeout(() => {
      isUndoing.current = false;
      console.log('Undo operation completed');
    }, 500);

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
