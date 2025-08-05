
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
  const [redoStack, setRedoStack] = useState<UndoState[]>([]);
  const isUndoing = useRef(false);
  const isRedoing = useRef(false);
  const isSavingHistory = useRef(false);
  const lastSavedHistoryRef = useRef<string>('');
  const lastStateSignature = useRef<string>('');
  const saveTimeout = useRef<NodeJS.Timeout>();
  const isAutoSaving = useRef(false);

  // Load undo history when rundown is loaded
  const loadUndoHistory = useCallback((history: UndoState[] = []) => {
    setUndoStack(history.slice(-20));
  }, []);

  // Save undo history to database - with better debouncing and auto-save coordination
  const saveUndoHistoryToDatabase = useCallback(async (newStack: UndoState[]) => {
    if (!props?.rundownId || !props.updateRundown || isSavingHistory.current || isUndoing.current || isAutoSaving.current) return;
    if (!props.currentTitle || !props.currentItems || !props.currentColumns) return;
    
    // Prevent saving the same history multiple times
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

  // Method to indicate when auto-save is active
  const setAutoSaving = useCallback((saving: boolean) => {
    isAutoSaving.current = saving;
  }, []);

  const saveState = useCallback((
    items: RundownItem[],
    columns: Column[],
    title: string,
    action: string
  ) => {
    // Don't save state during undo/redo operations, when saving history, or during auto-save
    if (isUndoing.current || isRedoing.current || isSavingHistory.current || isAutoSaving.current) {
      console.log('Skipping undo state save during:', { 
        isUndoing: isUndoing.current, 
        isRedoing: isRedoing.current,
        isSavingHistory: isSavingHistory.current, 
        isAutoSaving: isAutoSaving.current,
        action 
      });
      return;
    }
    
    // Clear redo stack when new state is saved
    if (redoStack.length > 0) {
      setRedoStack([]);
    }

    // Create a signature for the current state to avoid duplicate saves
    const currentSignature = JSON.stringify({ items, columns, title });
    if (lastStateSignature.current === currentSignature) {
      console.log('Skipping duplicate state save for action:', action);
      return;
    }

    console.log('Saving undo state for action:', action);
    lastStateSignature.current = currentSignature;

    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)), // Deep clone
      columns: JSON.parse(JSON.stringify(columns)), // Deep clone
      title,
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
      // Keep only last 20 states to prevent memory issues
      const trimmedStack = newStack.slice(-20);
      
      // Clear any existing timeout
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      
      // Save to database with longer delay to reduce frequency
      if (props?.rundownId && props?.updateRundown) {
        saveTimeout.current = setTimeout(() => {
          saveUndoHistoryToDatabase(trimmedStack);
        }, 3000);
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
    console.log('Undoing action:', lastState.action);
    
    // Mark that we're undoing to prevent saving this as a new state
    isUndoing.current = true;
    
    // Clear the last state signature to allow the restored state to be saved again if needed
    lastStateSignature.current = '';
    
    // Restore the previous state
    setItems(lastState.items);
    setColumns(lastState.columns);
    setTitle(lastState.title);
    
    // Add current state to redo stack before undoing
    if (props?.currentItems && props?.currentColumns && props?.currentTitle) {
      const currentState: UndoState = {
        items: JSON.parse(JSON.stringify(props.currentItems)),
        columns: JSON.parse(JSON.stringify(props.currentColumns)),
        title: props.currentTitle,
        action: 'Before undo',
        timestamp: Date.now()
      };
      setRedoStack(prev => [...prev, currentState].slice(-20));
    }
    
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
    
    // Reset the undoing flag after a longer delay to ensure all related updates complete
    setTimeout(() => {
      isUndoing.current = false;
      console.log('Undo operation completed');
    }, 1500); // Increased delay to prevent interference with auto-save

    return lastState.action;
  }, [undoStack, saveUndoHistoryToDatabase, props?.rundownId, props?.updateRundown]);

  const redo = useCallback((
    setItems: (items: RundownItem[]) => void,
    setColumns: (columns: Column[]) => void,
    setTitle: (title: string) => void
  ) => {
    if (redoStack.length === 0) {
      console.log('No redo states available');
      return null;
    }

    const nextState = redoStack[redoStack.length - 1];
    console.log('Redoing action:', nextState.action);
    
    // Save current state to undo stack before redoing
    if (props?.currentItems && props?.currentColumns && props?.currentTitle) {
      const currentState: UndoState = {
        items: JSON.parse(JSON.stringify(props.currentItems)),
        columns: JSON.parse(JSON.stringify(props.currentColumns)),
        title: props.currentTitle,
        action: 'Before redo',
        timestamp: Date.now()
      };
      setUndoStack(prev => [...prev, currentState].slice(-20));
    }
    
    // Mark that we're redoing to prevent saving this as a new state
    isRedoing.current = true;
    
    // Clear the last state signature to allow the restored state to be saved again if needed
    lastStateSignature.current = '';
    
    // Restore the next state
    setItems(nextState.items);
    setColumns(nextState.columns);
    setTitle(nextState.title);
    
    // Remove the state from redo stack
    const newRedoStack = redoStack.slice(0, -1);
    setRedoStack(newRedoStack);
    
    // Reset the redoing flag after operation completes
    setTimeout(() => {
      isRedoing.current = false;
      console.log('Redo operation completed');
    }, 1500);

    return nextState.action;
  }, [redoStack, props?.currentItems, props?.currentColumns, props?.currentTitle]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

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
    nextAction,
    loadUndoHistory,
    setAutoSaving // Export this so auto-save can coordinate
  };
};
