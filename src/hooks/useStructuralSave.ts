import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';
import { getTabId } from '@/utils/tabUtils';
import { toast } from 'sonner';

interface StructuralOperationData {
  items?: RundownItem[];
  order?: string[];
  deletedIds?: string[];
  newItems?: RundownItem[];
  insertIndex?: number;
  sequenceNumber?: number;
  lockedRowNumbers?: { [itemId: string]: string }; // For lock operations
  numberingLocked?: boolean; // For lock operations
  // Move metadata for reorder operations
  movedItemIds?: string[];      // IDs of items actually moved
  fromIndex?: number;           // Original position (first item's index for multi-select)
  toIndex?: number;             // New position (first item's index for multi-select)
  movedItemNames?: string[];    // Item names for display
}

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock';
  operationData: StructuralOperationData;
  userId: string;
  timestamp: string;
  tabId?: string;
}

export const useStructuralSave = (
  rundownId: string | null,
  onSaveComplete?: () => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  currentUserId?: string,
  onSaveError?: (error: string) => void
) => {
  const pendingOperationsRef = useRef<StructuralOperation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const failedOperationsRef = useRef<StructuralOperation[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  
  // localStorage keys for persistence
  const getStorageKey = useCallback(() => {
    return rundownId ? `rundown_failed_operations_${rundownId}` : null;
  }, [rundownId]);
  
  // Persist failed operations to localStorage
  const persistFailedOperations = useCallback(() => {
    const key = getStorageKey();
    if (!key) return;
    
    try {
      if (failedOperationsRef.current.length > 0) {
        localStorage.setItem(key, JSON.stringify(failedOperationsRef.current));
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to persist failed operations to localStorage:', error);
    }
  }, [getStorageKey]);
  
  // Load failed operations from localStorage on mount
  useEffect(() => {
    const key = getStorageKey();
    if (!key) return;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsedOps = JSON.parse(stored) as StructuralOperation[];
        if (parsedOps.length > 0) {
          failedOperationsRef.current = parsedOps;
          console.log(`📂 Loaded ${parsedOps.length} failed structural operations from previous session`);
          
          // Show toast and trigger immediate retry
          toast.info(`Found ${parsedOps.length} unsaved operation${parsedOps.length === 1 ? '' : 's'} from previous session`, {
            description: 'Retrying now...'
          });
          
          // Trigger retry after a short delay to let the UI settle
          setTimeout(() => {
            retryFailedStructuralOperations();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to load failed operations from localStorage:', error);
    }
  }, [rundownId]); // Only run on mount or rundownId change

  // Debounced save for batching operations
  const saveStructuralOperations = useCallback(async (): Promise<void> => {
    if (!rundownId || pendingOperationsRef.current.length === 0) {
      return;
    }

    const operations = [...pendingOperationsRef.current];
    pendingOperationsRef.current = [];
    
    console.log(`📦 Batching ${operations.length} structural operations:`, 
      operations.map(op => op.operationType).join(', '));
    
    onSaveStart?.();

    try {
      // Validate auth session before processing operations
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Session expired during structural save:', sessionError);
        
        failedOperationsRef.current.push(...operations);
        persistFailedOperations();
        
        const errorMsg = 'Session expired. Please refresh the page.';
        onSaveError?.(errorMsg);
        toast.error('Save Failed', {
          description: errorMsg
        });
        
        // Schedule retry
        scheduleRetry();
        return;
      }
      
      // Refresh token if expiring soon (< 5 minutes)
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt - now < 300) {
        console.log('🔄 Structural save: Token expiring soon - refreshing');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Token refresh failed');
        }
      }

      for (const operation of operations) {
        // PHASE 1: SAVE FIRST (Ensures data integrity)
        // Only broadcast after successful database save to prevent ghost data
        const { data, error } = await saveWithTimeout(
          () => supabase.functions.invoke('structural-operation-save', {
            body: operation
          }),
          `structural-save-${operation.operationType}`,
          20000
        );

        // Check for auth-specific errors
        const isAuthError = error && (
          error.message?.includes('JWT') ||
          error.message?.includes('token') ||
          error.message?.includes('auth') ||
          error.message?.includes('session') ||
          error.status === 401 ||
          error.status === 403
        );

        if (error || !data?.success) {
          const errorMsg = error?.message || 'Unknown error';
          
          if (isAuthError) {
            console.error('🔒 AUTH ERROR during structural save:', errorMsg);
            toast.error('Authentication Error', {
              description: 'Please refresh the page to continue editing.',
              duration: 10000
            });
          } else {
            console.error('🌐 NETWORK ERROR during structural save:', errorMsg);
          }
          
          throw new Error(errorMsg);
        }

        // Verify save actually succeeded
        if (!data || !data.success) {
          console.error('❌ Save response invalid:', data);
          throw new Error('Save verification failed - no success confirmation');
        }

        // Track our own update to prevent conflict detection
        if (data.updatedAt) {
          const context = rundownId ? `realtime-${rundownId}` : undefined;
          ownUpdateTracker.track(data.updatedAt, context);
        }
        
        console.log('✅ [DEBUG] Structural operation SAVED to database:', operation.operationType);

        // PHASE 2: BROADCAST AFTER SUCCESS (prevents ghost data)
        // Only broadcast once we know the save succeeded
        if (rundownId && currentUserId) {
          const { mapOperationToBroadcastField, mapOperationDataToPayload } = await import('@/utils/structuralOperationMapping');
          
          const broadcastField = mapOperationToBroadcastField(operation.operationType);
          const payload = mapOperationDataToPayload(operation.operationType, operation.operationData);
          
          console.log('📡 [DEBUG] Broadcasting structural operation AFTER successful save:', {
            operationType: operation.operationType,
            broadcastField,
            payload
          });
          
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            broadcastField,
            payload,
            currentUserId,
            getTabId()
          );
        }
      }
      
      onSaveComplete?.();
      console.log(`✅ Structural batch saved successfully: ${operations.length} operations`);
    } catch (error) {
      console.error(`❌ Structural batch failed: ${operations.length} operations - re-queued for retry`, error);
      
      // Store failed operations separately for retry UI
      failedOperationsRef.current.push(...operations);
      persistFailedOperations(); // Persist to localStorage immediately
      
      // Notify parent about the error
      const errorMessage = error instanceof Error ? error.message : 'Structural save failed';
      const errorMsg = `${operations.length} operations failed: ${errorMessage}`;
      
      if (onSaveError) {
        onSaveError(errorMsg);
      }
      
      // Only show toast if max retries exceeded
      if (retryCountRef.current >= maxRetries) {
        toast.error('Save Failed', {
          description: 'Unable to save structural changes after multiple attempts.'
        });
      }
      
      // Schedule auto-retry with exponential backoff
      scheduleRetry();
      
      // Error already handled - stored for retry, UI notified, retry scheduled
      return;
    }
  }, [rundownId, onSaveStart, onSaveComplete, currentUserId, onSaveError]);

  // Queue a structural operation with coordination
  const queueStructuralOperation = useCallback(
    (
      operationType: StructuralOperation['operationType'],
      operationData: StructuralOperationData,
      userId: string,
      sequenceNumber?: number
    ) => {
      if (!rundownId) return;

      const operation: StructuralOperation = {
        rundownId,
        operationType,
        operationData: {
          ...operationData,
          sequenceNumber
        },
        userId,
        timestamp: new Date().toISOString(),
        tabId: getTabId()
      };

      pendingOperationsRef.current.push(operation);
      onUnsavedChanges?.();

      // Debounce save operations
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Intelligent debounce based on lock state
      // Longer delay for locked rows to batch multiple operations and reduce lock contention
      const debounceDelay = operationData.numberingLocked ? 1500 : 500;

      saveTimeoutRef.current = setTimeout(() => {
        saveStructuralOperations().catch(error => {
          console.error('Structural save error:', error);
        });
      }, debounceDelay);
    },
    [rundownId, saveStructuralOperations, onUnsavedChanges]
  );

  // Flush all pending operations immediately
  const flushPendingOperations = useCallback(async (): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await saveStructuralOperations();
  }, [saveStructuralOperations]);

  // Check if there are pending operations
  const hasPendingOperations = useCallback((): boolean => {
    return pendingOperationsRef.current.length > 0;
  }, []);

  // Schedule retry with exponential backoff
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Exponential backoff: 30s, 60s, 120s, 240s, 480s
    const retryDelay = Math.min(30000 * Math.pow(2, retryCountRef.current), 480000);
    retryCountRef.current++;

    console.log(`⏳ Scheduling structural operation retry in ${retryDelay / 1000}s (attempt ${retryCountRef.current})`);

    retryTimeoutRef.current = setTimeout(() => {
      retryFailedStructuralOperations();
    }, retryDelay);
  }, []);

  // Retry failed structural operations
  const retryFailedStructuralOperations = useCallback(async () => {
    if (failedOperationsRef.current.length === 0) {
      return;
    }

    console.log(`🔄 Retrying ${failedOperationsRef.current.length} failed structural operations (attempt ${retryCountRef.current})`);

    // Move failed operations to pending for retry
    pendingOperationsRef.current.push(...failedOperationsRef.current);
    failedOperationsRef.current = [];

    try {
      await saveStructuralOperations();
      // Success - reset retry count
      retryCountRef.current = 0;
      persistFailedOperations(); // Clear from localStorage on success
      console.log('✅ Structural operation retry successful');
    } catch (error) {
      console.error('❌ Structural operation retry failed:', error);
      persistFailedOperations(); // Update localStorage with current failed operations
      if (retryCountRef.current < maxRetries) {
        scheduleRetry();
      } else {
        console.error('❌ Max retries reached for structural operations');
      }
    }
  }, [saveStructuralOperations, scheduleRetry, persistFailedOperations]);

  // Get count of failed structural operations
  const getFailedStructuralOperationsCount = useCallback(() => {
    return failedOperationsRef.current.length;
  }, []);

  // REMOVED: Save-on-unmount/beforeunload handlers
  // Prevents overwriting newer data with stale structural operations
  // Users should rely on regular auto-save during active editing

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations,
    retryFailedStructuralOperations,
    getFailedStructuralOperationsCount
  };
};