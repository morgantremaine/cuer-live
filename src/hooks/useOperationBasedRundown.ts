import { useState, useEffect, useCallback, useRef } from 'react';
import { useOperationQueue, Operation } from './useOperationQueue';
import { useOperationBroadcast } from './useOperationBroadcast';
import { supabase } from '@/integrations/supabase/client';

interface OperationBasedRundownState {
  items: any[];
  title: string;
  start_time: string | null;
  timezone: string | null;
  show_date: string | null;
  external_notes: any;
  lastSequence: number;
  isLoading: boolean;
  isOperationMode: boolean;
}

interface UseOperationBasedRundownOptions {
  rundownId: string;
  userId: string;
  enabled?: boolean;
}

export const useOperationBasedRundown = ({
  rundownId,
  userId,
  enabled = false
}: UseOperationBasedRundownOptions) => {
  const [state, setState] = useState<OperationBasedRundownState>({
    items: [],
    title: '',
    start_time: null,
    timezone: null,
    show_date: null,
    external_notes: {},
    lastSequence: 0,
    isLoading: true,
    isOperationMode: enabled // Set to enabled state immediately
  });

  console.log('🚀 OPERATION-BASED RUNDOWN INITIALIZED:', {
    rundownId,
    userId,
    enabled,
    isOperationMode: enabled
  });

  const clientId = useRef(`client_${userId}_${Date.now()}`).current;
  const baseStateRef = useRef<any>(null);

  // Initialize operation queue
  const operationQueue = useOperationQueue({
    rundownId,
    userId,
    clientId,
    onOperationApplied: (operation) => {
      console.log('✅ OPERATION APPLIED:', operation.id);
    },
    onOperationFailed: (operation, error) => {
      console.error('❌ OPERATION FAILED:', operation.id, error);
      // TODO: Show user notification about failed operation
    }
  });

  // Set up operation broadcasting
  const { broadcastOperation } = useOperationBroadcast({
    rundownId,
    clientId,
    onRemoteOperation: (operation) => {
      console.log('🎯 APPLYING REMOTE OPERATION:', operation.id);
      applyOperationToState(operation);
    }
  });

  // Apply operation to current state
  const applyOperationToState = useCallback((operation: any) => {
    setState(currentState => {
      const newState = { ...currentState };

      switch (operation.operationType) {
        case 'CELL_EDIT':
          newState.items = applyCellEdit(currentState.items, operation.operationData);
          break;
        
        case 'ROW_INSERT':
          newState.items = applyRowInsert(currentState.items, operation.operationData);
          break;
        
        case 'ROW_DELETE':
          newState.items = applyRowDelete(currentState.items, operation.operationData);
          break;
        
        case 'ROW_MOVE':
          newState.items = applyRowMove(currentState.items, operation.operationData);
          break;
        
        case 'ROW_COPY':
          newState.items = applyRowCopy(currentState.items, operation.operationData);
          break;
        
        case 'GLOBAL_EDIT':
          Object.assign(newState, operation.operationData);
          break;
      }

      if (operation.sequenceNumber) {
        newState.lastSequence = Math.max(newState.lastSequence, operation.sequenceNumber);
      }

      return newState;
    });
  }, []);

  // Load initial rundown state
  const loadInitialState = useCallback(async () => {
    if (!rundownId || !enabled) return;

    try {
      console.log('📥 LOADING INITIAL RUNDOWN STATE:', rundownId);

      const { data: rundown, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('id', rundownId)
        .single();

      if (error || !rundown) {
        throw new Error('Failed to load rundown');
      }

      // Check if operation mode is enabled
      if (!rundown.operation_mode_enabled) {
        setState(prev => ({ 
          ...prev, 
          isOperationMode: false, 
          isLoading: false 
        }));
        return;
      }

      // Store base state
      baseStateRef.current = rundown;

      // Set initial state from rundown
      setState(prev => ({
        ...prev,
        items: rundown.items || [],
        title: rundown.title || '',
        start_time: rundown.start_time,
        timezone: rundown.timezone,
        show_date: rundown.show_date,
        external_notes: rundown.external_notes || {},
        lastSequence: 0,
        isLoading: false,
        isOperationMode: true
      }));

      // Load any pending operations since last update
      await loadPendingOperations();

    } catch (error) {
      console.error('❌ FAILED TO LOAD INITIAL STATE:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isOperationMode: false 
      }));
    }
  }, [rundownId, enabled]);

  // Load pending operations
  const loadPendingOperations = useCallback(async () => {
    if (!rundownId || !state.isOperationMode) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-operations', {
        body: {
          rundownId,
          sinceSequence: state.lastSequence.toString()
        }
      });

      if (error || !data?.success) {
        console.error('Failed to load pending operations:', error);
        return;
      }

      const operations = data.operations || [];
      console.log('📥 LOADED PENDING OPERATIONS:', operations.length);

      // Apply operations in sequence order
      operations.forEach((operation: any) => {
        applyOperationToState(operation);
      });

    } catch (error) {
      console.error('❌ FAILED TO LOAD PENDING OPERATIONS:', error);
    }
  }, [rundownId, state.lastSequence, state.isOperationMode, applyOperationToState]);

  // Initialize on mount and when enabled changes
  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  // Operation handlers for UI components
  const handleCellEdit = useCallback((itemId: string, field: string, newValue: any) => {
    console.log('🔧 OPERATION BASED RUNDOWN: handleCellEdit called', {
      itemId,
      field,
      newValue,
      isOperationMode: state.isOperationMode,
      currentItemsCount: state.items.length,
      timestamp: new Date().toISOString()
    });
    
    if (!state.isOperationMode) {
      console.warn('⚠️ OPERATION MODE DISABLED: handleCellEdit ignored');
      return;
    }

    // Apply optimistically to local state
    const optimisticOperation = {
      operationType: 'CELL_EDIT' as const,
      operationData: { itemId, field, newValue },
      sequenceNumber: state.lastSequence + 1
    };
    
    console.log('🎯 APPLYING OPTIMISTIC UPDATE:', optimisticOperation);
    applyOperationToState(optimisticOperation);

    // Queue for server
    console.log('📤 QUEUEING FOR SERVER SYNC');
    operationQueue.cellEdit(itemId, field, newValue);
  }, [state.isOperationMode, state.lastSequence, operationQueue, applyOperationToState]);

  const handleRowInsert = useCallback((insertIndex: number, newItem: any) => {
    if (!state.isOperationMode) return;

    // Apply optimistically
    const optimisticOperation = {
      operationType: 'ROW_INSERT' as const,
      operationData: { insertIndex, newItem },
      sequenceNumber: state.lastSequence + 1
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.rowInsert(insertIndex, newItem);
  }, [state.isOperationMode, state.lastSequence, operationQueue, applyOperationToState]);

  const handleRowDelete = useCallback((itemId: string) => {
    if (!state.isOperationMode) return;

    const itemToDelete = state.items.find(item => item.id === itemId);
    if (!itemToDelete) return;

    // Apply optimistically
    const optimisticOperation = {
      operationType: 'ROW_DELETE' as const,
      operationData: { itemId, deletedItem: itemToDelete },
      sequenceNumber: state.lastSequence + 1
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.rowDelete(itemId, itemToDelete);
  }, [state.isOperationMode, state.lastSequence, state.items, operationQueue, applyOperationToState]);

  const handleRowMove = useCallback((fromIndex: number, toIndex: number) => {
    if (!state.isOperationMode || fromIndex === toIndex) return;

    const itemId = state.items[fromIndex]?.id;
    if (!itemId) return;

    // Apply optimistically
    const optimisticOperation = {
      operationType: 'ROW_MOVE' as const,
      operationData: { fromIndex, toIndex, itemId },
      sequenceNumber: state.lastSequence + 1
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.rowMove(fromIndex, toIndex, itemId);
  }, [state.isOperationMode, state.lastSequence, state.items, operationQueue, applyOperationToState]);

  const handleGlobalEdit = useCallback((field: string, newValue: any) => {
    if (!state.isOperationMode) return;

    // Apply optimistically
    const optimisticOperation = {
      operationType: 'GLOBAL_EDIT' as const,
      operationData: { [field]: newValue },
      sequenceNumber: state.lastSequence + 1
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.globalEdit(field, newValue);
  }, [state.isOperationMode, state.lastSequence, operationQueue, applyOperationToState]);

  return {
    // State
    ...state,
    clientId,
    
    // Handlers
    handleCellEdit,
    handleRowInsert,
    handleRowDelete,
    handleRowMove,
    handleGlobalEdit,
    
    // Queue status
    isProcessingOperations: operationQueue.isProcessing,
    queueLength: operationQueue.queueLength,
    
    // Utils
    loadPendingOperations,
    loadInitialState
  };
};

// Helper functions (same as in apply-operation edge function)
function applyCellEdit(items: any[], operationData: any): any[] {
  const { itemId, field, newValue } = operationData;
  
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, [field]: newValue };
    }
    return item;
  });
}

function applyRowInsert(items: any[], operationData: any): any[] {
  const { insertIndex, newItem } = operationData;
  const newItems = [...items];
  newItems.splice(insertIndex, 0, newItem);
  return newItems;
}

function applyRowDelete(items: any[], operationData: any): any[] {
  const { itemId } = operationData;
  return items.filter(item => item.id !== itemId);
}

function applyRowMove(items: any[], operationData: any): any[] {
  const { fromIndex, toIndex } = operationData;
  const newItems = [...items];
  const [movedItem] = newItems.splice(fromIndex, 1);
  newItems.splice(toIndex, 0, movedItem);
  return newItems;
}

function applyRowCopy(items: any[], operationData: any): any[] {
  const { sourceItemId, newItem, insertIndex } = operationData;
  const newItems = [...items];
  newItems.splice(insertIndex, 0, newItem);
  return newItems;
}