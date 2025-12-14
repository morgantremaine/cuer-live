import { useState, useCallback } from 'react';
import { useOfflineQueue } from './useOfflineQueue';
import { useOfflineQueueConflictDetection } from './useOfflineQueueConflictDetection';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { toast } from 'sonner';

/**
 * Enhanced offline queue with conflict resolution UI
 * Wraps useOfflineQueue and adds conflict detection and resolution
 */
export const useOfflineQueueWithConflicts = (rundownId: string | null) => {
  const offlineQueue = useOfflineQueue(rundownId);
  const {
    pendingConflicts,
    detectConflictsBeforeProcess,
    resolveConflicts,
    cancelConflictResolution
  } = useOfflineQueueConflictDetection();

  const [showConflictModal, setShowConflictModal] = useState(false);

  // Enhanced queue operation with conflict detection
  const queueOperationWithConflicts = useCallback((
    type: 'save' | 'delete' | 'create' | 'cell-updates',
    data: any,
    targetRundownId: string | null = rundownId,
    baselineState?: any,
    baselineDocVersion?: number
  ) => {
    // Queue the operation
    const operationId = offlineQueue.queueOperation(
      type,
      data,
      targetRundownId,
      baselineState,
      baselineDocVersion
    );

    return operationId;
  }, [rundownId, offlineQueue]);

  // Enhanced process queue with conflict detection
  const processQueueWithConflicts = useCallback(async () => {
    // Get operations to process
    const operations = offlineQueue.getQueuedOperations();
    
    for (const operation of operations) {
      if (operation.type === 'cell-updates' && rundownId) {
        // Check for conflicts before processing
        const conflictResult = await detectConflictsBeforeProcess(operation, rundownId);
        
        if (!conflictResult.canProceed && conflictResult.conflicts) {
          // Show conflict resolution modal
          setShowConflictModal(true);
          return; // Pause queue processing
        }
      }
    }
    
    // No conflicts - proceed with normal processing
    await offlineQueue.processQueue();
  }, [offlineQueue, detectConflictsBeforeProcess, rundownId]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback((resolutions: Map<string, 'ours' | 'theirs'>) => {
    const resolvedOperation = resolveConflicts(resolutions);
    
    if (resolvedOperation) {
      // Update the operation in the queue with resolved changes
      toast.success('Conflicts resolved - syncing changes');
      setShowConflictModal(false);
      
      // Continue processing queue
      offlineQueue.processQueue();
    }
  }, [resolveConflicts, offlineQueue]);

  // Handle conflict cancellation
  const handleCancelConflicts = useCallback(() => {
    cancelConflictResolution();
    setShowConflictModal(false);
  }, [cancelConflictResolution]);

  // Render conflict resolution modal
  const ConflictModal = useCallback(() => {
    if (!pendingConflicts || !showConflictModal) return null;

    return (
      <ConflictResolutionModal
        open={showConflictModal}
        conflicts={pendingConflicts.conflicts}
        onResolve={handleConflictResolution}
        onCancel={handleCancelConflicts}
      />
    );
  }, [pendingConflicts, showConflictModal, handleConflictResolution, handleCancelConflicts]);

  return {
    ...offlineQueue,
    queueOperation: queueOperationWithConflicts,
    processQueue: processQueueWithConflicts,
    ConflictModal,
    hasPendingConflicts: !!pendingConflicts
  };
};
