import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';
import { structuralBackup } from '@/utils/structuralOperationBackup';

interface StructuralOperationData {
  items?: RundownItem[];
  order?: string[];
  deletedIds?: string[];
  newItems?: RundownItem[];
  insertIndex?: number;
  sequenceNumber?: number;
  contentSnapshot?: RundownItem[]; // Snapshot of current content to prevent race conditions
  lockedRowNumbers?: { [itemId: string]: string }; // For lock operations
  numberingLocked?: boolean; // For lock operations
}

interface StructuralOperation {
  rundownId: string;
  operationType: 'add_row' | 'delete_row' | 'move_rows' | 'copy_rows' | 'reorder' | 'add_header' | 'toggle_lock';
  operationData: StructuralOperationData;
  userId: string;
  timestamp: string;
  retryCount?: number; // Track retry attempts to prevent infinite loops
}

export const useStructuralSave = (
  rundownId: string | null,
  onSaveComplete?: () => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  currentUserId?: string
) => {
  const pendingOperationsRef = useRef<StructuralOperation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const periodicFlushIntervalRef = useRef<NodeJS.Timeout>();
  const hasLoadedBackupRef = useRef(false);

  // Debounced save for batching operations
  const saveStructuralOperations = useCallback(async (): Promise<void> => {
    if (!rundownId || pendingOperationsRef.current.length === 0) {
      return;
    }

    const operations = [...pendingOperationsRef.current];
    pendingOperationsRef.current = [];
    
    onSaveStart?.();

    try {
      // Validate auth session before processing operations
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Structural save: Auth session invalid - re-queuing operations');
        // Re-queue operations instead of losing them
        pendingOperationsRef.current.unshift(...operations);
        throw new Error('Authentication required');
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
        // PHASE 1: DATABASE PERSISTENCE FIRST (Data Safety Pattern)
        // Save to database before broadcasting to ensure data is persisted
        const { data, error } = await saveWithTimeout(
          () => supabase.functions.invoke('structural-operation-save', {
            body: operation
          }),
          `structural-save-${operation.operationType}`,
          20000
        );

        // Check for conflict (409)
        if (error?.status === 409 || data?.error === 'Conflict detected') {
          console.error('🚨 CONFLICT: Another user has made changes. Refreshing...');
          
          // Don't re-queue - these operations are stale
          const { toast } = await import('@/components/ui/sonner');
          toast.error('Conflict Detected', {
            description: 'Another user made changes while you were editing. The page will refresh to show the latest version.',
            duration: Infinity,
            action: {
              label: 'Refresh Now',
              onClick: () => window.location.reload()
            }
          });
          
          // Auto-refresh after 3 seconds
          setTimeout(() => window.location.reload(), 3000);
          return; // Don't process more operations
        }

        if (error) {
          console.error('Structural save error:', error);
          
          // CRITICAL: Alert user immediately about save failure
          const { toast } = await import('@/components/ui/sonner');
          toast.error('Failed to save changes', {
            description: 'Your structural changes could not be saved. Please check your connection.',
            duration: 10000, // Show for 10 seconds
            action: {
              label: 'Retry Now',
              onClick: () => {
                console.log('🔄 User requested manual retry of pending operations');
                flushPendingOperations().catch(console.error);
              }
            }
          });
          
          throw error;
        }

        // PHASE 2: BROADCAST ONLY AFTER SUCCESSFUL SAVE (Data Safety Pattern)
        // Other users only see changes that are actually persisted
        if (data?.success && rundownId && currentUserId) {
          // Import mapping functions dynamically to avoid circular dependencies
          const { mapOperationToBroadcastField, mapOperationDataToPayload } = await import('@/utils/structuralOperationMapping');
          
          const broadcastField = mapOperationToBroadcastField(operation.operationType);
          const payload = mapOperationDataToPayload(operation.operationType, operation.operationData);
          
          console.log('📡 Broadcasting structural operation (AFTER successful save):', {
            operationType: operation.operationType,
            broadcastField,
            payload
          });
          
          cellBroadcast.broadcastCellUpdate(
            rundownId,
            undefined,
            broadcastField,
            payload,
            currentUserId
          );
          
          // Track our own update to prevent conflict detection via centralized tracker
          if (data.updatedAt) {
            const context = rundownId ? `realtime-${rundownId}` : undefined;
            ownUpdateTracker.track(data.updatedAt, context);
          }
          
          console.log('✅ Structural operation saved and broadcast:', operation.operationType);
        }
      }
      
      onSaveComplete?.();
      
      // Clear localStorage backup on successful save
      structuralBackup.clear();
    } catch (error) {
      console.error('Structural save batch error:', error);
      
      // Separate retriable vs. permanently failed operations
      const retriableOps = operations.filter(op => (op.retryCount || 0) < 3);
      const permanentlyFailedOps = operations.filter(op => (op.retryCount || 0) >= 3);
      
      // Alert user about permanently failed operations
      if (permanentlyFailedOps.length > 0) {
        console.error('❌ CRITICAL: Operations failed after 3 retries', {
          count: permanentlyFailedOps.length,
          operations: permanentlyFailedOps.map(op => ({
            type: op.operationType,
            timestamp: op.timestamp,
            retries: op.retryCount
          }))
        });
        
        const { toast } = await import('@/components/ui/sonner');
        toast.error('Critical Save Failure', {
          description: `${permanentlyFailedOps.length} operations could not be saved after multiple attempts. Your changes may be lost. Please refresh the page and contact support.`,
          duration: Infinity, // Keep visible until dismissed
          action: {
            label: 'Refresh Page',
            onClick: () => window.location.reload()
          }
        });
      }
      
      // Re-queue only retriable operations with incremented retry count
      if (retriableOps.length > 0) {
        console.log(`🔄 Re-queuing ${retriableOps.length} operations (attempt ${(retriableOps[0].retryCount || 0) + 2}/3)`);
        pendingOperationsRef.current.unshift(...retriableOps.map(op => ({
          ...op,
          retryCount: (op.retryCount || 0) + 1
        })));
      }
      
      throw error;
    }
  }, [rundownId, onSaveStart, onSaveComplete, currentUserId]);

  // Queue a structural operation with coordination
  const queueStructuralOperation = useCallback(
    (
      operationType: StructuralOperation['operationType'],
      operationData: StructuralOperationData,
      userId: string,
      sequenceNumber?: number
    ) => {
      if (!rundownId) return;

      // RATE LIMITING: Detect cascade - if too many operations queued too fast
      const now = Date.now();
      const recentOpsCount = pendingOperationsRef.current.filter(op => 
        new Date(op.timestamp).getTime() > now - 5000 // Last 5 seconds
      ).length;

      if (recentOpsCount >= 50) {
        console.error('🚨 CASCADE DETECTED: Too many operations queued', {
          recentCount: recentOpsCount,
          totalPending: pendingOperationsRef.current.length
        });
        
        import('@/components/ui/sonner').then(({ toast }) => {
          toast.error('System Overload', {
            description: 'Too many operations are queued. Please refresh the page to clear pending changes.',
            duration: Infinity,
            action: {
              label: 'Refresh Now',
              onClick: () => window.location.reload()
            }
          });
        });
        
        return; // Don't queue more operations
      }

      const operation: StructuralOperation = {
        rundownId,
        operationType,
        operationData: {
          ...operationData,
          sequenceNumber
        },
        userId,
        timestamp: new Date().toISOString()
      };

      pendingOperationsRef.current.push(operation);
      
      // Backup to localStorage immediately
      structuralBackup.save(pendingOperationsRef.current);
      
      onUnsavedChanges?.();

      // Debounce save operations
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveStructuralOperations().catch(error => {
          console.error('Structural save error:', error);
        });
      }, 100);
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


  // Periodic auto-flush every 10 seconds to prevent queue buildup
  useEffect(() => {
    if (!rundownId) return;
    
    const interval = setInterval(() => {
      if (hasPendingOperations()) {
        console.log('⏰ Periodic auto-flush: Flushing pending operations');
        flushPendingOperations().catch(error => {
          console.error('Periodic flush error:', error);
        });
      }
    }, 10000); // 10 seconds
    
    periodicFlushIntervalRef.current = interval;
    
    return () => {
      if (periodicFlushIntervalRef.current) {
        clearInterval(periodicFlushIntervalRef.current);
      }
    };
  }, [rundownId, hasPendingOperations, flushPendingOperations]);

  // Load backup operations on mount
  useEffect(() => {
    if (hasLoadedBackupRef.current || !rundownId) return;
    hasLoadedBackupRef.current = true;
    
    const backup = structuralBackup.load();
    if (backup && backup.operations.length > 0) {
      const savedAt = new Date(backup.savedAt);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - savedAt.getTime()) / 60000);
      
      console.log('💾 Found unsaved operations in localStorage', {
        count: backup.operations.length,
        savedAt: backup.savedAt,
        minutesAgo
      });
      
      // Show recovery UI
      import('@/components/ui/sonner').then(({ toast }) => {
        toast.info('Unsaved Changes Found', {
          description: `Found ${backup.operations.length} unsaved operations from ${minutesAgo} minutes ago. Would you like to recover them?`,
          duration: Infinity,
          action: {
            label: 'Recover',
            onClick: () => {
              // Filter operations for this rundown
              const relevantOps = backup.operations.filter(
                (op: any) => op.rundownId === rundownId
              );
              
              if (relevantOps.length > 0) {
                pendingOperationsRef.current = relevantOps as StructuralOperation[];
                flushPendingOperations().catch(console.error);
                toast.success(`Recovering ${relevantOps.length} operations...`);
              }
            }
          },
          cancel: {
            label: 'Discard',
            onClick: () => {
              structuralBackup.clear();
              toast.success('Discarded unsaved operations');
            }
          }
        });
      });
    }
  }, [rundownId, flushPendingOperations]);

  return {
    queueStructuralOperation,
    flushPendingOperations,
    hasPendingOperations
  };
};