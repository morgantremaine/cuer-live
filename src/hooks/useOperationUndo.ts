import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { UndoableOperation } from '@/types/undoOperation';
import { reverseOperation, applyOperationForward } from '@/utils/operationReversal';

// Helper function to transform redo operation data to match structural save format
const transformDataForStructuralSave = (operationType: string, operationData: any): any => {
  switch (operationType) {
    case 'add_row':
    case 'add_header':
      // Transform: addedItem + addedIndex -> newItems + insertIndex
      return {
        newItems: operationData.addedItem ? [operationData.addedItem] : [],
        insertIndex: operationData.addedIndex
      };
      
    case 'delete_row':
      // Already in correct format (deletedIds)
      return operationData;
      
    case 'reorder':
      // Transform to expected format
      return {
        order: operationData.newOrder
      };
      
    default:
      return operationData;
  }
};

interface UseOperationUndoProps {
  items: RundownItem[];
  updateItem: (id: string, updates: Partial<RundownItem>) => void;
  deleteRow: (id: string) => void;
  setItems: (items: RundownItem[]) => void;
  setUndoActive?: (active: boolean) => void;
  userId?: string;
  onOperationComplete?: (operationType: string, operationData: any) => void;
}

// Helper function to map operation types to their reverse for broadcasting
const getReverseOperationType = (originalType: string): string | null => {
  switch (originalType) {
    case 'add_row':
    case 'add_header':
      return 'delete_row';
    case 'delete_row':
      return 'add_row';
    case 'reorder':
      return 'reorder';
    case 'cell_edit':
      return null; // Handled by per-cell save
    default:
      return null;
  }
};

// Helper function to transform operation data to match reverse operation's expected format
const transformDataForReverseOp = (originalType: string, originalData: any): any => {
  switch (originalType) {
    case 'add_row':
    case 'add_header':
      // Original: { addedItem, addedIndex, addedItemId }
      // Reverse (delete_row) expects: { deletedItem, deletedIndex, deletedIds }
      return {
        deletedItem: originalData.addedItem,
        deletedIndex: originalData.addedIndex,
        deletedIds: [originalData.addedItemId]
      };
      
    case 'delete_row':
      // Original: { deletedItem, deletedIndex }
      // Reverse (add_row) expects: { addedItem, addedIndex, addedItemId }
      return {
        addedItem: originalData.deletedItem,
        addedIndex: originalData.deletedIndex,
        addedItemId: originalData.deletedItem.id
      };
      
    case 'reorder':
      // Original: { oldOrder, newOrder }
      // Reverse (reorder) expects: { oldOrder, newOrder } but swapped
      return {
        oldOrder: originalData.newOrder,
        newOrder: originalData.oldOrder
      };
      
    default:
      return originalData;
  }
};

export const useOperationUndo = ({ 
  items,
  updateItem,
  deleteRow,
  setItems,
  setUndoActive,
  userId = 'anonymous',
  onOperationComplete
}: UseOperationUndoProps) => {
  const [undoStack, setUndoStack] = useState<UndoableOperation[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableOperation[]>([]);
  const isUndoing = useRef(false);
  const isRedoing = useRef(false);

  // Record a new operation
  const recordOperation = useCallback((operation: Omit<UndoableOperation, 'userId' | 'timestamp'>) => {
    if (isUndoing.current || isRedoing.current) {
      return;
    }

    const fullOperation: UndoableOperation = {
      ...operation,
      userId,
      timestamp: Date.now()
    };

    console.log('📝 Recording operation:', operation.description);

    setUndoStack(prev => {
      const newStack = [...prev, fullOperation];
      return newStack.slice(-5); // Keep only last 5 operations
    });
    
    setRedoStack([]);
  }, [userId]);

  // Perform undo operation
  const undo = useCallback(() => {
    if (undoStack.length === 0) {
      console.log('No undo operations available');
      return null;
    }

    const lastOperation = undoStack[undoStack.length - 1];
    console.log('⏪ Undoing operation:', lastOperation.description);
    
    isUndoing.current = true;
    
    if (setUndoActive) {
      setUndoActive(true);
    }
    
    const success = reverseOperation(
      lastOperation,
      items,
      updateItem,
      deleteRow,
      setItems
    );

    if (success) {
      // Move operation to redo stack
      setRedoStack(prev => [...prev, lastOperation].slice(-5));
      setUndoStack(prev => prev.slice(0, -1));
      
      // Trigger broadcast/save via callback with REVERSE operation type and transformed data
      if (onOperationComplete) {
        const reverseOpType = getReverseOperationType(lastOperation.type);
        if (reverseOpType) {
          const transformedData = transformDataForReverseOp(lastOperation.type, lastOperation.data);
          onOperationComplete(reverseOpType, transformedData);
        }
      }
    }
    
    setTimeout(() => {
      isUndoing.current = false;
      if (setUndoActive) {
        setUndoActive(false);
      }
      console.log('⏪ Undo operation completed');
    }, 1000);

    return success ? lastOperation.description : null;
  }, [undoStack, items, updateItem, deleteRow, setItems, setUndoActive, onOperationComplete]);

  // Perform redo operation
  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      console.log('No redo operations available');
      return null;
    }

    const nextOperation = redoStack[redoStack.length - 1];
    console.log('⏩ Redoing operation:', nextOperation.description);
    
    isRedoing.current = true;
    
    if (setUndoActive) {
      setUndoActive(true);
    }
    
    // Apply the operation forward (not reverse)
    const success = applyOperationForward(
      nextOperation,
      items,
      updateItem,
      deleteRow,
      setItems
    );

    if (success) {
      setUndoStack(prev => [...prev, nextOperation].slice(-5));
      setRedoStack(prev => prev.slice(0, -1));
    }
    
    setTimeout(() => {
      isRedoing.current = false;
      if (setUndoActive) {
        setUndoActive(false);
      }
      
      // Trigger broadcast/save AFTER isRedoing is cleared and state has propagated
      if (success && onOperationComplete && nextOperation.type !== 'cell_edit') {
        const transformedData = transformDataForStructuralSave(nextOperation.type, nextOperation.data);
        onOperationComplete(nextOperation.type, transformedData);
      }
      
      console.log('⏩ Redo operation completed');
    }, 1000);

    return success ? nextOperation.description : null;
  }, [redoStack, items, updateItem, deleteRow, setItems, setUndoActive, onOperationComplete]);

  const canUndo = undoStack.length > 0;
  const lastAction = undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null;
  const canRedo = redoStack.length > 0;
  const nextRedoAction = redoStack.length > 0 ? redoStack[redoStack.length - 1].description : null;

  return {
    recordOperation,
    undo,
    redo,
    canUndo,
    lastAction,
    canRedo,
    nextRedoAction
  };
};
