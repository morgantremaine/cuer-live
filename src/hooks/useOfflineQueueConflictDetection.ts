import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { threeWayMergeFieldUpdates, applyConflictResolutions, FieldConflict } from '@/utils/threeWayMerge';
import { toast } from 'sonner';

interface QueuedOperation {
  id: string;
  type: 'save' | 'delete' | 'cell-updates' | 'create';
  data: any;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
  baselineState?: any;
  baselineTimestamp?: number;
}

export const useOfflineQueueConflictDetection = () => {
  const [pendingConflicts, setPendingConflicts] = useState<{
    operation: QueuedOperation;
    conflicts: FieldConflict[];
    currentState: any;
  } | null>(null);

  /**
   * Detect conflicts before processing an operation
   * Returns true if operation can proceed, false if conflicts need resolution
   */
  const detectConflictsBeforeProcess = useCallback(async (
    operation: QueuedOperation,
    rundownId: string
  ): Promise<{ canProceed: boolean; mergedUpdates?: any[]; conflicts?: FieldConflict[] }> => {
    // Only check conflicts for cell-updates
    if (operation.type !== 'cell-updates' || !operation.baselineState) {
      return { canProceed: true };
    }

    try {
      // Fetch current server state
      const { data: currentRundown, error } = await supabase
        .from('rundowns')
        .select('items, title, show_date, timezone, start_time, updated_at, doc_version')
        .eq('id', rundownId)
        .single();

      if (error || !currentRundown) {
        console.warn('Could not fetch current state for conflict detection');
        return { canProceed: true }; // Proceed anyway if we can't check
      }

      // Check if state changed while offline
      const serverTimestamp = new Date(currentRundown.updated_at).getTime();
      const baselineTimestamp = operation.baselineTimestamp || operation.timestamp;

      if (serverTimestamp <= baselineTimestamp) {
        // No changes on server - safe to proceed
        console.log('✅ No server changes detected - proceeding with offline sync');
        return { canProceed: true };
      }

      // Server has newer data - perform three-way merge
      console.warn('⚠️ Server state changed while offline - performing conflict detection');
      
      const mergeResult = threeWayMergeFieldUpdates(
        operation.baselineState,
        currentRundown,
        operation.data,
        operation.data.fieldUpdates || []
      );

      if (mergeResult.conflicts.length === 0) {
        // Auto-merged successfully
        console.log(`✅ Auto-merged ${mergeResult.autoResolved} changes, no conflicts`);
        toast.success(`Synced ${mergeResult.autoResolved} offline changes`);
        return { 
          canProceed: true, 
          mergedUpdates: mergeResult.merged 
        };
      } else {
        // Conflicts detected - need user resolution
        console.warn(`🚨 ${mergeResult.conflicts.length} conflicts detected, awaiting user resolution`);
        setPendingConflicts({
          operation,
          conflicts: mergeResult.conflicts,
          currentState: currentRundown
        });
        
        return { 
          canProceed: false, 
          conflicts: mergeResult.conflicts 
        };
      }

    } catch (error) {
      console.error('Error during conflict detection:', error);
      return { canProceed: true }; // Proceed anyway on error
    }
  }, []);

  /**
   * Resolve conflicts and continue processing
   */
  const resolveConflicts = useCallback((resolutions: Map<string, 'ours' | 'theirs'>) => {
    if (!pendingConflicts) return null;

    const { operation } = pendingConflicts;
    const resolvedUpdates = applyConflictResolutions(
      operation.data.fieldUpdates || [],
      resolutions
    );

    // Clear pending conflicts
    setPendingConflicts(null);

    // Return resolved operation
    return {
      ...operation,
      data: {
        ...operation.data,
        fieldUpdates: resolvedUpdates
      }
    };
  }, [pendingConflicts]);

  /**
   * Cancel conflict resolution and discard offline changes
   */
  const cancelConflictResolution = useCallback(() => {
    setPendingConflicts(null);
    toast.info('Offline changes discarded');
  }, []);

  return {
    pendingConflicts,
    detectConflictsBeforeProcess,
    resolveConflicts,
    cancelConflictResolution
  };
};
