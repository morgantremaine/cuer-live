
import { useState, useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

import { debugLogger } from '@/utils/debugLogger';

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
    // Don't save state during undo operations, when saving history, or during auto-save
    if (isUndoing.current || isSavingHistory.current || isAutoSaving.current) {
      console.log('Skipping undo state save during:', { 
        isUndoing: isUndoing.current, 
        isSavingHistory: isSavingHistory.current, 
        isAutoSaving: isAutoSaving.current,
        action 
      });
      return;
    }

    // Create a signature for the current state to avoid duplicate saves
    const currentSignature = JSON.stringify({ items, columns, title });
    if (lastStateSignature.current === currentSignature) {
      debugLogger.autosave('Skipping duplicate state save for action:', action);
      return;
    }

    debugLogger.autosave('Saving undo state for action:', action);
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
    saveState,
    undo,
    canUndo,
    lastAction,
    loadUndoHistory,
    setAutoSaving // Export this so auto-save can coordinate
  };
};
