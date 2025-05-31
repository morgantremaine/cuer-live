
import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface UndoAction {
  type: 'UPDATE_ITEMS' | 'UPDATE_ITEM' | 'ADD_ROW' | 'ADD_HEADER' | 'DELETE_ROW' | 'DELETE_MULTIPLE_ROWS' | 'TOGGLE_FLOAT';
  previousState: RundownItem[];
  currentState: RundownItem[];
  description: string;
}

export const useUndoRedo = (
  items: RundownItem[],
  setItems: (items: RundownItem[]) => void,
  markAsChanged: () => void
) => {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const isUndoingRef = useRef(false);

  const saveState = useCallback((
    type: UndoAction['type'], 
    previousState: RundownItem[], 
    currentState: RundownItem[], 
    description: string
  ) => {
    if (isUndoingRef.current) return;

    const action: UndoAction = {
      type,
      previousState,
      currentState,
      description
    };

    setUndoStack(prev => [...prev.slice(-19), action]); // Keep last 20 actions
    setRedoStack([]); // Clear redo stack when new action is performed
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    isUndoingRef.current = true;
    
    setItems(lastAction.previousState);
    markAsChanged();
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);
    
    // Reset the flag after a brief delay to allow state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 100);
  }, [undoStack, setItems, markAsChanged]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextAction = redoStack[redoStack.length - 1];
    isUndoingRef.current = true;
    
    setItems(nextAction.currentState);
    markAsChanged();
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, nextAction]);
    
    // Reset the flag after a brief delay to allow state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 100);
  }, [redoStack, setItems, markAsChanged]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo
  };
};
