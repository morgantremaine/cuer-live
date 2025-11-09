import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { UndoableOperation } from '@/types/undoOperation';
import { reverseOperation, applyOperationForward } from '@/utils/operationReversal';

// Helper function to transform redo operation data to match structural save format
const transformDataForStructuralSave = (operationType: string, operationData: any): any => {
  switch (operationType) {
    case 'add_row':
    case 'add_header':
      // Handle both single and batch adds
      if (operationData.addedItems && Array.isArray(operationData.addedItems)) {
        // Batch add (e.g., paste operation)
        return {
          newItems: operationData.addedItems,
          insertIndex: operationData.addedIndex
        };
      } else if (operationData.addedItem) {
        // Single add
        return {
          newItems: [operationData.addedItem],
          insertIndex: operationData.addedIndex
        };
      }
      return {
        newItems: [],
        insertIndex: operationData.addedIndex || 0
      };
      
    case 'delete_row':
      // Only pass deletedIds (works for both single and batch)
      return {
        deletedIds: operationData.deletedIds || []
      };
      
    case 'reorder':
      // Transform to expected format (order array)
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
      // Handle both single and batch adds
      if (originalData.addedItems && Array.isArray(originalData.addedItems)) {
        // Batch add -> batch delete
        return {
          deletedItems: originalData.addedItems,
          deletedIndices: originalData.addedItems.map((_: any, idx: number) => 
            originalData.addedIndex + idx
          ),
          deletedIds: originalData.addedItemIds
        };
      } else {
        // Single add -> single delete
        return {
          deletedItem: originalData.addedItem,
          deletedIndex: originalData.addedIndex,
          deletedIds: [originalData.addedItemId]
        };
      }
      
    case 'delete_row':
      // Handle both single and batch deletes
      if (originalData.deletedItems && Array.isArray(originalData.deletedItems)) {
        // Batch delete -> batch add
        return {
          addedItems: originalData.deletedItems,
          addedIndex: Math.min(...originalData.deletedIndices),
          addedItemIds: originalData.deletedIds
        };
      } else {
        // Single delete -> single add
        return {
          addedItem: originalData.deletedItem,
          addedIndex: originalData.deletedIndex,
          addedItemId: originalData.deletedItem.id
        };
      }
      
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
  
  // Track active typing sessions for batched undo
  const typingSessionsRef = useRef<Map<string, {
    itemId: string;
    field: string;
    initialValue: any;
    timeoutId: NodeJS.Timeout | null;
  }>>(new Map());
  
  const TYPING_PAUSE_MS = 1000; // Record undo after 1 second of no typing

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

    if (import.meta.env.DEV && localStorage.getItem('debugUndo') === '1') {
      console.log('📝 Recording operation:', operation.description);
    }

    setUndoStack(prev => {
      const newStack = [...prev, fullOperation];
      return newStack.slice(-5); // Keep only last 5 operations
    });
    
    setRedoStack([]);
  }, [userId]);

  // Record a batched cell edit - groups rapid typing into single undo operation
  const recordBatchedCellEdit = useCallback((
    itemId: string,
    field: string,
    oldValue: any,
    newValue: any,
    finalizeImmediately = false
  ) => {
    if (isUndoing.current || isRedoing.current) {
      return;
    }

    const sessionKey = `${itemId}-${field}`;
    const existingSession = typingSessionsRef.current.get(sessionKey);
    
    if (!existingSession) {
      // Start new typing session - capture initial value
      const session = {
        itemId,
        field,
        initialValue: oldValue,
        timeoutId: null as NodeJS.Timeout | null
      };
      typingSessionsRef.current.set(sessionKey, session);
      if (import.meta.env.DEV && localStorage.getItem('debugUndo') === '1') {
        console.log('⌨️ Started typing session:', sessionKey, 'initial:', oldValue);
      }
    }
    
    const session = typingSessionsRef.current.get(sessionKey)!;
    
    // Clear existing timeout
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }
    
    if (finalizeImmediately) {
      // Finalize immediately (field blur, focus change, structural op, etc.)
      if (import.meta.env.DEV && localStorage.getItem('debugUndo') === '1') {
        console.log('✅ Finalizing typing session immediately:', sessionKey);
      }
      recordOperation({
        type: 'cell_edit',
        data: { itemId, field, oldValue: session.initialValue, newValue },
        description: `Edit ${field}`
      });
      typingSessionsRef.current.delete(sessionKey);
    } else {
      // Set timeout to finalize after pause
      session.timeoutId = setTimeout(() => {
        if (import.meta.env.DEV && localStorage.getItem('debugUndo') === '1') {
          console.log('⏱️ Typing pause detected - finalizing session:', sessionKey);
        }
        recordOperation({
          type: 'cell_edit',
          data: { itemId, field, oldValue: session.initialValue, newValue },
          description: `Edit ${field}`
        });
        typingSessionsRef.current.delete(sessionKey);
      }, TYPING_PAUSE_MS);
    }
  }, [recordOperation]);

  // Finalize a specific typing session
  const finalizeTypingSession = useCallback((sessionKey: string) => {
    const session = typingSessionsRef.current.get(sessionKey);
    if (session) {
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }
      if (import.meta.env.DEV && localStorage.getItem('debugUndo') === '1') {
        console.log('🔚 Finalizing specific typing session:', sessionKey);
      }
      // Get current value from items
      const item = items.find(i => i.id === session.itemId);
      if (item) {
        const currentValue = session.field.startsWith('customFields.') 
          ? item.customFields?.[session.field.replace('customFields.', '')]
          : (item as any)[session.field === 'segmentName' ? 'name' : session.field];
        
        recordOperation({
          type: 'cell_edit',
          data: { 
            itemId: session.itemId, 
            field: session.field, 
            oldValue: session.initialValue, 
            newValue: currentValue 
          },
          description: `Edit ${session.field}`
        });
      }
      typingSessionsRef.current.delete(sessionKey);
    }
  }, [items, recordOperation]);

  // Finalize all active typing sessions (on structural changes or blur)
  const finalizeAllTypingSessions = useCallback(() => {
    if (typingSessionsRef.current.size > 0) {
      console.log('🔚 Finalizing all typing sessions:', typingSessionsRef.current.size);
      typingSessionsRef.current.forEach((session, key) => {
        if (session.timeoutId) {
          clearTimeout(session.timeoutId);
        }
        // Get current value from items
        const item = items.find(i => i.id === session.itemId);
        if (item) {
          const currentValue = session.field.startsWith('customFields.') 
            ? item.customFields?.[session.field.replace('customFields.', '')]
            : (item as any)[session.field === 'segmentName' ? 'name' : session.field];
          
          recordOperation({
            type: 'cell_edit',
            data: { 
              itemId: session.itemId, 
              field: session.field, 
              oldValue: session.initialValue, 
              newValue: currentValue 
            },
            description: `Edit ${session.field}`
          });
        }
      });
      typingSessionsRef.current.clear();
    }
  }, [items, recordOperation]);

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
          // Further transform to structural save format (handles reorder: newOrder -> order)
          const structuralData = transformDataForStructuralSave(reverseOpType, transformedData);
          onOperationComplete(reverseOpType, structuralData);
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
    recordBatchedCellEdit,
    finalizeTypingSession,
    finalizeAllTypingSessions,
    undo,
    redo,
    canUndo,
    lastAction,
    canRedo,
    nextRedoAction,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length
  };
};
