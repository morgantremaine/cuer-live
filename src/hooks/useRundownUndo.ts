import { useState, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UndoState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  action: string;
  timestamp: number;
}

export const useRundownUndo = () => {
  const [undoHistory, setUndoHistory] = useState<UndoState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  const saveState = useCallback((items: RundownItem[], columns: Column[], title: string, action: string) => {
    const newState: UndoState = {
      items: JSON.parse(JSON.stringify(items)),
      columns: JSON.parse(JSON.stringify(columns)),
      title,
      action,
      timestamp: Date.now()
    };

    setUndoHistory(prev => {
      const newHistory = [...prev, newState];
      // Keep only last 50 states to prevent memory issues
      return newHistory.slice(-50);
    });
    setCanUndo(true);
    setLastAction(action);
  }, []);

  const undo = useCallback((
    setItems: (items: RundownItem[]) => void,
    setColumns: (columns: Column[]) => void,
    setTitle: (title: string) => void
  ): string => {
    if (undoHistory.length === 0) return '';

    const previousState = undoHistory[undoHistory.length - 1];
    
    setItems(previousState.items);
    setColumns(previousState.columns);
    setTitle(previousState.title);

    setUndoHistory(prev => prev.slice(0, -1));
    setCanUndo(undoHistory.length > 1);
    
    const actionDescription = `Undid: ${previousState.action}`;
    setLastAction(actionDescription);
    
    return actionDescription;
  }, [undoHistory]);

  const loadUndoHistory = useCallback((history?: UndoState[]) => {
    if (history) {
      setUndoHistory(history);
      setCanUndo(history.length > 0);
    }
  }, []);

  return {
    saveState,
    undo,
    canUndo,
    lastAction,
    loadUndoHistory,
    undoHistory // Now exposed
  };
};
