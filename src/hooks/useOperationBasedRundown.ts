import { useState, useEffect, useCallback, useRef } from 'react';
import { useOperationQueue, Operation } from './useOperationQueue';
import { useOperationBroadcast } from './useOperationBroadcast';
import { useSmartSaveIndicator } from './useSmartSaveIndicator';
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

  // Only log once when the hook is first created
  const hasLoggedInit = useRef(false);
  if (!hasLoggedInit.current && enabled) {
    console.log('🚀 OPERATION-BASED RUNDOWN INITIALIZED:', {
      rundownId,
      userId,
      enabled,
      isOperationMode: enabled
    });
    hasLoggedInit.current = true;
  }

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

  // Initialize smart save indicator
  const smartSaveIndicator = useSmartSaveIndicator({
    operationQueue: {
      isProcessing: operationQueue.isProcessing,
      queueLength: operationQueue.queueLength,
      lastSaved: operationQueue.lastSaved,
      saveError: operationQueue.saveError
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
    // Validate operation has required fields
    if (!operation?.operationType) {
      console.error('❌ OPERATION MISSING TYPE:', operation);
      return;
    }

    // Validate operationData exists
    if (!operation.operationData) {
      console.error('❌ OPERATION MISSING DATA:', {
        type: operation.operationType,
        id: operation.id,
        operation
      });
      return;
    }
    
    console.log('📨 APPLYING OPERATION TO STATE:', {
      type: operation.operationType,
      id: operation.id
    });
    
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
        
        default:
          console.warn('⚠️ Unknown operation type:', operation.operationType);
      }

      if (operation.sequenceNumber) {
        newState.lastSequence = Math.max(newState.lastSequence, operation.sequenceNumber);
      }

      return newState;
    });
  }, []);

  // Track if we've already loaded to prevent re-initialization
  const hasLoadedRef = useRef(false);
  const currentRundownIdRef = useRef<string | null>(null);

  // Load initial rundown state - stable implementation
  const loadInitialState = useCallback(async () => {
    if (!rundownId || !enabled) return;
    
    // Prevent re-loading the same rundown
    if (hasLoadedRef.current && currentRundownIdRef.current === rundownId) return;

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

      // Mark as loaded and track current rundown
      hasLoadedRef.current = true;
      currentRundownIdRef.current = rundownId;

      // Mark as initialized BEFORE loading operations
      hasLoadedRef.current = true;
      currentRundownIdRef.current = rundownId;
      
      // Load any pending operations since last update (NOW state is initialized)
      try {
        const { data, error } = await supabase.functions.invoke('get-operations', {
          body: {
            rundownId,
            sinceSequence: '0'
          }
        });

        if (data?.success && data.operations) {
          console.log('📥 LOADED PENDING OPERATIONS:', data.operations.length);
          
          // Apply operations one at a time to initialized state
          data.operations.forEach((operation: any) => {
            console.log('🔄 APPLYING LOADED OPERATION:', {
              type: operation.operationType,
              id: operation.id,
              hasType: !!operation.operationType
            });
            applyOperationToState(operation);
          });
        }
      } catch (opError) {
        console.error('❌ FAILED TO LOAD PENDING OPERATIONS:', opError);
      }

    } catch (error) {
      console.error('❌ FAILED TO LOAD INITIAL STATE:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isOperationMode: false 
      }));
    }
  }, [rundownId, enabled, applyOperationToState]);

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

  // Initialize only when rundownId or enabled changes, not on every render
  useEffect(() => {
    // Reset loading state when rundown changes
    if (currentRundownIdRef.current !== rundownId) {
      hasLoadedRef.current = false;
    }
    loadInitialState();
  }, [rundownId, enabled]); // Use direct dependencies, not the callback

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
    if (!itemId) {
      console.error('Cannot move row: item not found at index', fromIndex);
      return;
    }

    const optimisticOperation: Operation = {
      id: `temp_${Date.now()}`,
      operationType: 'ROW_MOVE',
      operationData: { fromIndex, toIndex, itemId }, // Include itemId for robust application
      rundownId,
      userId,
      clientId,
      timestamp: Date.now(),
      status: 'pending'
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.rowMove(fromIndex, toIndex, itemId);
  }, [state.isOperationMode, state.lastSequence, state.items, operationQueue, applyOperationToState]);

  const handleRowCopy = useCallback((sourceItemId: string, newItem: any, insertIndex: number) => {
    if (!state.isOperationMode) return;

    const optimisticOperation: Operation = {
      id: `temp_${Date.now()}`,
      operationType: 'ROW_COPY',
      operationData: { sourceItemId, newItem, insertIndex },
      rundownId,
      userId,
      clientId,
      timestamp: Date.now(),
      status: 'pending'
    };
    applyOperationToState(optimisticOperation);

    // Queue for server
    operationQueue.rowCopy(sourceItemId, newItem, insertIndex);
  }, [state.isOperationMode, state.lastSequence, operationQueue, applyOperationToState, rundownId, userId, clientId]);

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
    handleRowCopy,
    handleGlobalEdit,
    
    // Queue status
    isProcessingOperations: operationQueue.isProcessing,
    queueLength: operationQueue.queueLength,
    
    // Enhanced save state for indicators (using smart save indicator)
    isSaving: smartSaveIndicator.isSaving,
    hasUnsavedChanges: smartSaveIndicator.hasUnsavedChanges,
    lastSaved: smartSaveIndicator.lastSaved,
    saveError: smartSaveIndicator.saveError,
    hasContentChanges: true, // Operation-based changes are always content changes
    isTyping: smartSaveIndicator.isTyping,
    showSaved: smartSaveIndicator.showSaved,
    
    // Keystroke handler for triggering typing detection
    handleKeystroke: smartSaveIndicator.handleKeystroke,
    
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
  
  console.log('🗑️ ROW_DELETE: Before deletion', {
    itemId,
    totalItems: items.length,
    itemExists: items.some(item => item.id === itemId)
  });
  
  const newItems = items.filter(item => item.id !== itemId);
  
  console.log('✅ ROW_DELETE APPLIED:', {
    itemId,
    itemsRemoved: items.length - newItems.length,
    beforeCount: items.length,
    afterCount: newItems.length
  });
  
  return newItems;
}

function applyRowMove(items: any[], operationData: any): any[] {
  // Validate operation data
  if (!operationData || typeof operationData !== 'object') {
    console.warn('⚠️ ROW_MOVE: Invalid operation data', operationData);
    return items;
  }

  const { toIndex, itemId } = operationData;
  
  // Validate required fields
  if (itemId === undefined || toIndex === undefined) {
    console.warn('⚠️ ROW_MOVE: Missing required fields', { itemId, toIndex, operationData });
    return items;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn('⚠️ ROW_MOVE: Invalid items array', items);
    return items;
  }
  
  // Find item by ID for robustness
  const currentIndex = items.findIndex(item => item && item.id === itemId);
  
  if (currentIndex === -1) {
    console.warn('⚠️ ROW_MOVE: Item not found:', itemId);
    return items;
  }
  
  // If already at target position, no change needed
  if (currentIndex === toIndex) {
    return items;
  }
  
  const newItems = [...items];
  const [movedItem] = newItems.splice(currentIndex, 1);
  newItems.splice(toIndex, 0, movedItem);
  
  console.log('✅ ROW_MOVE APPLIED:', {
    itemId,
    from: currentIndex,
    to: toIndex
  });
  
  return newItems;
}

function applyRowCopy(items: any[], operationData: any): any[] {
  const { sourceItemId, newItem, insertIndex } = operationData;
  const newItems = [...items];
  newItems.splice(insertIndex, 0, newItem);
  return newItems;
}