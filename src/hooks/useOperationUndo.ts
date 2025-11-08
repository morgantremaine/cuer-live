
import { useState, useCallback, useEffect, useRef } from 'react';
import { UndoableOperation } from '@/types/undoOperation';
import { RundownItem } from '@/types/rundown';
import { reverseOperation, applyOperation } from '@/utils/operationReversal';
import { toast } from 'sonner';

const MAX_UNDO_OPERATIONS = 5;

interface UseOperationUndoProps {
  rundownId: string | null;
  userId: string | null;
  items: RundownItem[];
  updateItem: (id: string, updates: Partial<RundownItem>) => void;
  deleteRow: (id: string) => void;
  setItems: (items: RundownItem[]) => void;
  addMultipleRows: (items: RundownItem[]) => void;
}

export const useOperationUndo = ({
  rundownId,
  userId,
  items,
  updateItem,
  deleteRow,
  setItems,
  addMultipleRows
}: UseOperationUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoableOperation[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableOperation[]>([]);
  
  const isUndoingRef = useRef(false);
  const isRedoingRef = useRef(false);

  // Generate localStorage key for this rundown and user
  const getStorageKey = useCallback(() => {
    if (!rundownId || !userId) return null;
    return `undo-${rundownId}-${userId}`;
  }, [rundownId, userId]);

  // Load undo history from localStorage on mount
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUndoStack(parsed.undoStack || []);
        setRedoStack(parsed.redoStack || []);
        console.log('📚 Loaded undo history:', {
          undoCount: parsed.undoStack?.length || 0,
          redoCount: parsed.redoStack?.length || 0
        });
      }
    } catch (error) {
      console.error('Failed to load undo history:', error);
    }
  }, [getStorageKey]);

  // Save undo history to localStorage whenever stacks change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        undoStack,
        redoStack
      }));
    } catch (error) {
      console.error('Failed to save undo history:', error);
    }
  }, [undoStack, redoStack, getStorageKey]);

  /**
   * Record a new undoable operation
   */
  const recordOperation = useCallback((operation: Omit<UndoableOperation, 'userId' | 'timestamp'>) => {
    // Don't record operations during undo/redo
    if (isUndoingRef.current || isRedoingRef.current) {
      return;
    }

    const fullOperation: UndoableOperation = {
      ...operation,
      userId: userId || 'unknown',
      timestamp: Date.now()
    };

    console.log('📝 Recording operation:', fullOperation.type, fullOperation.description);

    setUndoStack(prev => {
      const newStack = [...prev, fullOperation];
      // Limit stack size
      if (newStack.length > MAX_UNDO_OPERATIONS) {
        return newStack.slice(-MAX_UNDO_OPERATIONS);
      }
      return newStack;
    });

    // Clear redo stack when new operation is recorded
    setRedoStack([]);
  }, [userId]);

  /**
   * Undo the last operation
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) {
      toast.info('Nothing to undo');
      return;
    }

    const lastOperation = undoStack[undoStack.length - 1];
    
    isUndoingRef.current = true;
    
    const success = reverseOperation(
      lastOperation,
      { updateItem, deleteRow, setItems, addMultipleRows },
      items
    );

    if (success) {
      // Move operation to redo stack
      setRedoStack(prev => [...prev, lastOperation]);
      setUndoStack(prev => prev.slice(0, -1));
      
      toast.success(`Undid: ${lastOperation.description}`);
    }

    // Reset flag after a short delay to allow state updates to propagate
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 100);
  }, [undoStack, items, updateItem, deleteRow, setItems, addMultipleRows]);

  /**
   * Redo the last undone operation
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      toast.info('Nothing to redo');
      return;
    }

    const lastUndone = redoStack[redoStack.length - 1];
    
    isRedoingRef.current = true;
    
    const success = applyOperation(
      lastUndone,
      { updateItem, deleteRow, setItems, addMultipleRows },
      items
    );

    if (success) {
      // Move operation back to undo stack
      setUndoStack(prev => [...prev, lastUndone]);
      setRedoStack(prev => prev.slice(0, -1));
      
      toast.success(`Redid: ${lastUndone.description}`);
    }

    // Reset flag after a short delay
    setTimeout(() => {
      isRedoingRef.current = false;
    }, 100);
  }, [redoStack, items, updateItem, deleteRow, setItems, addMultipleRows]);

  return {
    recordOperation,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastOperation: undoStack[undoStack.length - 1]?.description,
    nextRedoOperation: redoStack[redoStack.length - 1]?.description
  };
};
