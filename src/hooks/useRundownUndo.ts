import { useState, useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UndoState {
  items: RundownItem[];
  columns: Column[];
  title: string;
  action: string;
  timestamp: number;
}

interface UseRundownUndoProps {
  rundownId?: string;
  updateRundown?: (id: string, title: string, items: RundownItem[], silent?: boolean, archived?: boolean, columns?: Column[], timezone?: string, startTime?: string, icon?: string, undoHistory?: any[]) => Promise<void>;
  currentTitle: string;
  currentItems: RundownItem[];
  currentColumns: Column[];
}

export const useRundownUndo = ({ rundownId, updateRundown, currentTitle, currentItems, currentColumns }: UseRundownUndoProps) => {
  const [undoHistory, setUndoHistory] = useState<UndoState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Update canUndo state whenever history changes
  useEffect(() => {
    setCanUndo(undoHistory.length > 0);
  }, [undoHistory]);

  const saveState = useCallback((items: RundownItem[], columns: Column[], title: string, action: string) => {
    const newState: UndoState = {
      items: [...items],
      columns: [...columns], 
      title,
      action,
      timestamp: Date.now()
    };

    setUndoHistory(prev => {
      const updated = [...prev, newState];
      // Keep only last 50 states to prevent memory issues
      const trimmed = updated.slice(-50);
      
      // Auto-save undo history to database
      if (rundownId && updateRundown) {
        updateRundown(rundownId, currentTitle, currentItems, true, false, currentColumns, undefined, undefined, undefined, trimmed).catch(error => {
          console.error('Failed to save undo history:', error);
        });
      }
      
      return trimmed;
    });
    setLastAction(action);
  }, [rundownId, updateRundown, currentTitle, currentItems, currentColumns]);

  const undo = useCallback((
    setItemsFn: (items: RundownItem[]) => void, 
    setColumnsFn: (columns: Column[]) => void,
    setTitleFn: (title: string) => void
  ) => {
    if (undoHistory.length === 0) return null;
    
    // Get the previous state and remove it from history
    setUndoHistory(prev => {
      const newHistory = [...prev];
      const lastState = newHistory.pop();
      
      if (lastState) {
        // Apply the previous state
        setItemsFn(lastState.items);
        if (lastState.columns) {
          setColumnsFn(lastState.columns);
        }
        setTitleFn(lastState.title);
        
        // Auto-save updated undo history to database
        if (rundownId && updateRundown) {
          updateRundown(rundownId, currentTitle, currentItems, true, false, currentColumns, undefined, undefined, undefined, newHistory).catch(error => {
            console.error('Failed to save updated undo history after undo:', error);
          });
        }
        
        return newHistory;
      }
      return prev;
    });
    
    return lastAction;
  }, [undoHistory, lastAction, rundownId, updateRundown, currentTitle, currentItems, currentColumns]);

  const loadUndoHistory = useCallback((history: UndoState[]) => {
    if (Array.isArray(history)) {
      setUndoHistory(history);
      if (history.length > 0) {
        setLastAction(history[history.length - 1].action);
      }
    }
  }, []);

  return {
    saveState,
    undo,
    canUndo,
    lastAction,
    loadUndoHistory,
    undoHistory // Export undo history for auto-save
  };
};
