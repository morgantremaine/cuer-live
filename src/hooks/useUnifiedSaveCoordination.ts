import { useRef, useCallback, useState } from 'react';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';

interface SaveOperation {
  id: string;
  type: 'auto-save' | 'teleprompter' | 'showcaller' | 'manual';
  priority: number;
  execute: () => Promise<boolean>;
  onComplete?: (success: boolean) => void;
  timestamp: number;
}

interface CoordinationState {
  isAnySaving: boolean;
  activeSaves: Map<string, SaveOperation>;
  saveQueue: SaveOperation[];
  isProcessingQueue: boolean;
  lastSaveTimestamp: number;
}

/**
 * Unified coordination system for ALL save operations
 * Prevents conflicts between auto-save, teleprompter, showcaller, and manual saves
 */
export const useUnifiedSaveCoordination = () => {
  const { shouldBlockAutoSave, executeWithCellUpdate, executeWithShowcallerOperation } = useCellUpdateCoordination();
  
  const stateRef = useRef<CoordinationState>({
    isAnySaving: false,
    activeSaves: new Map(),
    saveQueue: [],
    isProcessingQueue: false,
    lastSaveTimestamp: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout>();

  // Priority levels: higher number = higher priority
  const PRIORITIES = {
    manual: 100,      // User-initiated saves (Ctrl+S)
    teleprompter: 80, // Teleprompter script saves
    showcaller: 60,   // Showcaller state updates
    'auto-save': 40   // Background auto-saves
  };

  // Check if any saves are currently active
  const isAnySaveActive = useCallback(() => {
    return stateRef.current.isAnySaving || stateRef.current.activeSaves.size > 0;
  }, []);

  // Check if a specific type of save should be blocked
  const shouldBlockSave = useCallback((type: SaveOperation['type']): boolean => {
    const state = stateRef.current;
    
    // Manual saves should almost never be blocked
    if (type === 'manual') {
      return false;
    }

    // Check cell update coordination
    if (shouldBlockAutoSave()) {
      console.log(`🛑 Save blocked (${type}): Cell update coordination`);
      return true;
    }

    // Check for conflicting save types
    const hasConflictingSave = Array.from(state.activeSaves.values()).some(save => {
      // Teleprompter and auto-save can conflict
      if (type === 'teleprompter' && save.type === 'auto-save') return true;
      if (type === 'auto-save' && save.type === 'teleprompter') return true;
      
      // Showcaller operations should not conflict with content saves
      if (type === 'showcaller' && (save.type === 'auto-save' || save.type === 'teleprompter')) return false;
      if ((type === 'auto-save' || type === 'teleprompter') && save.type === 'showcaller') return false;
      
      // Same type saves should be queued, not blocked
      return false;
    });

    if (hasConflictingSave) {
      console.log(`🛑 Save blocked (${type}): Conflicting save in progress`);
      return true;
    }

    return false;
  }, [shouldBlockAutoSave]);

  // Process the save queue
  const processQueue = useCallback(async () => {
    const state = stateRef.current;
    
    if (state.isProcessingQueue || state.saveQueue.length === 0) {
      return;
    }

    state.isProcessingQueue = true;
    
    try {
      // Sort queue by priority (highest first) and timestamp (oldest first for same priority)
      state.saveQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older first for same priority
      });

      // Process saves one by one, respecting blocking conditions
      while (state.saveQueue.length > 0) {
        const operation = state.saveQueue[0];
        
        // Check if this operation should still be blocked
        if (shouldBlockSave(operation.type)) {
          console.log(`⏸️ Save queued (${operation.type}): Still blocked`);
          break; // Stop processing queue, will retry later
        }

        // Remove from queue and add to active saves
        state.saveQueue.shift();
        state.activeSaves.set(operation.id, operation);
        state.isAnySaving = true;
        setIsSaving(true);

        console.log(`▶️ Executing queued save (${operation.type}):`, operation.id);

        try {
          const success = await operation.execute();
          console.log(`✅ Save completed (${operation.type}):`, { id: operation.id, success });
          
          operation.onComplete?.(success);
          state.lastSaveTimestamp = Date.now();
        } catch (error) {
          console.error(`❌ Save failed (${operation.type}):`, { id: operation.id, error });
          operation.onComplete?.(false);
        } finally {
          // Remove from active saves
          state.activeSaves.delete(operation.id);
        }

        // Small delay between saves to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      state.isProcessingQueue = false;
      state.isAnySaving = state.activeSaves.size > 0;
      setIsSaving(state.isAnySaving);
    }
  }, [shouldBlockSave]);

  // Schedule save with coordination
  const coordinatedSave = useCallback(async (
    type: SaveOperation['type'],
    saveFunction: () => Promise<boolean>,
    options: {
      id?: string;
      priority?: number;
      onComplete?: (success: boolean) => void;
      immediate?: boolean;
    } = {}
  ): Promise<boolean> => {
    const {
      id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      priority = PRIORITIES[type],
      onComplete,
      immediate = false
    } = options;

    console.log(`🎯 Coordinated save requested (${type}):`, { id, priority, immediate });

    // Wrap save function with appropriate coordination
    const coordinatedExecute = async (): Promise<boolean> => {
      if (type === 'showcaller') {
        return new Promise((resolve) => {
          executeWithShowcallerOperation(async () => {
            const result = await saveFunction();
            resolve(result);
          });
        });
      } else {
        return new Promise((resolve) => {
          executeWithCellUpdate(async () => {
            const result = await saveFunction();
            resolve(result);
          });
        });
      }
    };

    const operation: SaveOperation = {
      id,
      type,
      priority,
      execute: coordinatedExecute,
      onComplete,
      timestamp: Date.now()
    };

    // Check if we can execute immediately
    if (immediate && !shouldBlockSave(type)) {
      console.log(`⚡ Executing immediate save (${type}):`, id);
      
      stateRef.current.activeSaves.set(id, operation);
      stateRef.current.isAnySaving = true;
      setIsSaving(true);

      try {
        const success = await operation.execute();
        onComplete?.(success);
        stateRef.current.lastSaveTimestamp = Date.now();
        return success;
      } finally {
        stateRef.current.activeSaves.delete(id);
        stateRef.current.isAnySaving = stateRef.current.activeSaves.size > 0;
        setIsSaving(stateRef.current.isAnySaving);
      }
    } else {
      // Add to queue
      console.log(`📥 Queueing save (${type}):`, { id, reason: shouldBlockSave(type) ? 'blocked' : 'queued' });
      stateRef.current.saveQueue.push(operation);

      // Schedule queue processing
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        processQueue();
      }, shouldBlockSave(type) ? 500 : 100); // Longer delay if blocked

      return false; // Queued, not executed immediately
    }
  }, [shouldBlockSave, executeWithCellUpdate, executeWithShowcallerOperation, processQueue]);

  // Specific save coordinators for different types
  const coordinateAutoSave = useCallback(async (
    saveFunction: () => Promise<boolean>,
    options?: { onComplete?: (success: boolean) => void }
  ) => {
    return coordinatedSave('auto-save', saveFunction, {
      ...options,
      immediate: false // Auto-saves are never immediate
    });
  }, [coordinatedSave]);

  const coordinateTeleprompterSave = useCallback(async (
    saveFunction: () => Promise<boolean>,
    options?: { onComplete?: (success: boolean) => void; immediate?: boolean }
  ) => {
    return coordinatedSave('teleprompter', saveFunction, {
      ...options,
      immediate: options?.immediate ?? true // Teleprompter saves default to immediate
    });
  }, [coordinatedSave]);

  const coordinateShowcallerSave = useCallback(async (
    saveFunction: () => Promise<boolean>,
    options?: { onComplete?: (success: boolean) => void }
  ) => {
    return coordinatedSave('showcaller', saveFunction, {
      ...options,
      immediate: true // Showcaller updates should be immediate
    });
  }, [coordinatedSave]);

  const coordinateManualSave = useCallback(async (
    saveFunction: () => Promise<boolean>,
    options?: { onComplete?: (success: boolean) => void }
  ) => {
    return coordinatedSave('manual', saveFunction, {
      ...options,
      immediate: true // Manual saves are always immediate
    });
  }, [coordinatedSave]);

  // Get current coordination state
  const getCoordinationState = useCallback(() => {
    const state = stateRef.current;
    return {
      isAnySaving: state.isAnySaving,
      activeSaveCount: state.activeSaves.size,
      queuedSaveCount: state.saveQueue.length,
      isProcessingQueue: state.isProcessingQueue,
      lastSaveTimestamp: state.lastSaveTimestamp,
      activeSaveTypes: Array.from(state.activeSaves.values()).map(op => op.type),
      queuedSaveTypes: state.saveQueue.map(op => op.type)
    };
  }, []);

  // Force process queue (for debugging or emergency situations)
  const forceProcessQueue = useCallback(() => {
    console.log('🔧 Force processing save queue');
    processQueue();
  }, [processQueue]);

  // Clear all queued saves (emergency function)
  const clearQueue = useCallback((type?: SaveOperation['type']) => {
    const state = stateRef.current;
    
    if (type) {
      state.saveQueue = state.saveQueue.filter(op => op.type !== type);
      console.log(`🧹 Cleared ${type} saves from queue`);
    } else {
      state.saveQueue = [];
      console.log('🧹 Cleared entire save queue');
    }
  }, []);
  return {
    // Primary coordination functions  
    coordinateAutoSave,
    coordinateTeleprompterSave,
    coordinateShowcallerSave,
    coordinateManualSave,
    
    // Generic coordination
    coordinatedSave,
    
    // State queries
    isAnySaveActive,
    isSaving,
    getCoordinationState,
    
    // Queue management
    forceProcessQueue,
    clearQueue
  };
};
    coordinateShowcallerSave,
    coordinateManualSave,
    
    // Generic coordination
    coordinatedSave,
    
    // State queries
    isAnySaveActive,
    isSaving,
    getCoordinationState,
    
    // Control functions
    forceProcessQueue,
    clearQueue
  };
};