import { useEffect, useCallback, useRef } from 'react';
import { useUnifiedAutoSave } from '@/components/UnifiedAutoSaveProvider';
import { bulletproofCellBroadcast, BulletproofCellUpdate } from '@/utils/bulletproofCellBroadcast';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to integrate bulletproof cell updates with the auto-save system
 * Replaces the old cellBroadcast system with conflict-protected updates
 */
export const useBulletproofCellUpdates = (
  rundownId: string,
  onCellUpdate: (itemId: string, fieldName: string, value: any) => void
) => {
  const { user } = useAuth();
  const autoSave = useUnifiedAutoSave();
  const currentUserId = user?.id;
  const setupRef = useRef(false);
  const onCellUpdateRef = useRef(onCellUpdate);
  
  // Keep the callback reference stable
  useEffect(() => {
    onCellUpdateRef.current = onCellUpdate;
  }, [onCellUpdate]);

  // Set up bulletproof cell broadcast subscription with stable dependencies
  useEffect(() => {
    if (!rundownId || !currentUserId || setupRef.current) return;
    
    setupRef.current = true;
    console.log('🔌 Setting up bulletproof cell updates for rundown:', rundownId);

    // Inject the conflict resolver into the bulletproof broadcast system
    const conflictResolver = {
      detectConflict: (itemId: string, fieldName: string, value: any, timestamp: number) => {
        // Use the auto-save system's conflict detection
        // This will check against local shadows automatically
        return null; // For now, let the auto-save system handle conflicts
      },
      resolveConflict: (conflict: any) => {
        return { strategy: 'remote_wins', reason: 'Default resolution' };
      },
      applyResolution: (conflict: any, resolution: any) => {
        return conflict.remoteValue;
      }
    };

    bulletproofCellBroadcast.setConflictResolver(conflictResolver);

    // Subscribe to protected cell updates with stable callback
    const unsubscribe = bulletproofCellBroadcast.subscribeToCellUpdates(
      rundownId,
      (update: BulletproofCellUpdate, resolvedValue?: any) => {
        console.log('📨 Bulletproof cell update received:', {
          itemId: update.itemId,
          fieldName: update.fieldName,
          originalValue: update.value,
          resolvedValue: resolvedValue || update.value
        });

        // Apply the conflict-resolved value to the UI using stable ref
        onCellUpdateRef.current(update.itemId, update.fieldName, resolvedValue || update.value);
      },
      currentUserId
    );

    return () => {
      setupRef.current = false;
      console.log('🧹 Cleaning up bulletproof cell updates');
      unsubscribe?.();
    };
  }, [rundownId, currentUserId]); // Removed autoSave from deps to prevent loops

  // Bulletproof cell update function for components to use (stable with useCallback)
  const updateCell = useCallback(
    (itemId: string, fieldName: string, value: any) => {
      if (!rundownId || !currentUserId) {
        console.warn('🚫 Cannot update cell: Missing rundown ID or user ID');
        return;
      }

      console.log('📝 Bulletproof cell update:', { itemId, fieldName, value });

      // Trigger auto-save field handlers for conflict protection
      autoSave.onFieldFocus(itemId, fieldName, value);
      autoSave.onFieldChange(itemId, fieldName, value);

      // Broadcast the protected update
      bulletproofCellBroadcast.broadcastCellUpdate(
        rundownId,
        itemId,
        fieldName,
        value,
        currentUserId
      );

      // Trigger auto-save completion
      setTimeout(() => {
        autoSave.onFieldBlur(itemId, fieldName, value);
      }, 100); // Small delay to ensure broadcast completes first
    },
    [rundownId, currentUserId, autoSave]
  );

  return {
    updateCell,
    // Provide access to auto-save status
    isSaving: autoSave.isSaving,
    hasPendingChanges: autoSave.hasPendingChanges,
    hasConflicts: autoSave.hasConflicts,
    conflictCount: autoSave.conflictCount
  };
};