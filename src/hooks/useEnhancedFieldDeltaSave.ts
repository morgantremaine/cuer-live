import { useCallback, useRef } from 'react';
import { useFieldDeltaSave } from './useFieldDeltaSave';
import { usePerCellSave } from './usePerCellSave';
import { usePerCellSaveFeatureFlag } from './usePerCellSaveFeatureFlag';
import { useFieldLevelRealtime } from './useFieldLevelRealtime';
import { logger } from '@/utils/logger';

// Enhanced version that routes to either old system or new per-cell save system
export const useEnhancedFieldDeltaSave = (
  rundownId: string,
  trackOwnUpdate: (timestamp: string) => void
) => {
  const { isPerCellSaveEnabled } = usePerCellSaveFeatureFlag();
  const trackingRef = useRef<{ [key: string]: any }>({});
  
  // Old system
  const oldFieldDeltaSave = useFieldDeltaSave(
    rundownId,
    trackOwnUpdate
  );

  // New system
  const { saveField, enablePerCellSaveForRundown } = usePerCellSave(rundownId);
  
  // Field-level real-time for enhanced collaboration
  const { broadcastFieldUpdate } = useFieldLevelRealtime({
    rundownId,
    enabled: isPerCellSaveEnabled
  });

  const trackFieldChange = useCallback((itemId: string | undefined, fieldName: string, value: any) => {
    if (!isPerCellSaveEnabled) {
      return oldFieldDeltaSave.trackFieldChange(itemId, fieldName, value);
    }
    
    // Track for new system - store for potential batch operations
    if (!itemId) return;
    
    const fieldKey = `${itemId}.${fieldName}`;
    trackingRef.current[fieldKey] = {
      itemId,
      fieldName,
      value,
      timestamp: Date.now()
    };

    logger.debug('Tracking field change for per-cell save', {
      itemId,
      fieldName,
      fieldKey
    });
  }, [isPerCellSaveEnabled, oldFieldDeltaSave]);

  const saveDeltaState = useCallback(async (currentState: any): Promise<{ updatedAt: string; docVersion: number; }> => {
    if (!isPerCellSaveEnabled) {
      return oldFieldDeltaSave.saveDeltaState(currentState);
    }

    // Check if we have tracked fields to save
    const trackedFieldsCount = Object.keys(trackingRef.current).length;
    if (trackedFieldsCount === 0) {
      return oldFieldDeltaSave.saveDeltaState(currentState);
    }

    // NEW: Take snapshot of fields to save to prevent race conditions
    const fieldsToSave = { ...trackingRef.current };
    
    // Clear tracking immediately to prevent duplicate saves
    trackingRef.current = {};

    // New per-cell save system
    logger.info('Using per-cell save system', {
      trackedFields: Object.keys(fieldsToSave).length,
      fieldKeys: Object.keys(fieldsToSave)
    });

    // First ensure per-cell save is enabled for this rundown
    await enablePerCellSaveForRundown();

    // Save each tracked field individually with error tracking
    const saveResults: { [key: string]: { success: boolean; version?: number; error?: string } } = {};
    
    const savePromises = Object.entries(fieldsToSave).map(
      async ([fieldKey, { itemId, fieldName, value }]) => {
        try {
          logger.info('💾 Per-cell save starting', { fieldKey, itemId, fieldName });
          
          const result = await saveField(itemId, fieldName, value);
          saveResults[fieldKey] = result;
          
          if (result.success) {
            logger.info('✅ Per-cell save successful', { fieldKey, version: result.version });
            
            // Broadcast field update to other users for real-time collaboration
            await broadcastFieldUpdate(itemId, fieldName, value, result.version || Date.now());
            
            return { fieldKey, success: true, version: result.version };
          } else {
            logger.warn('❌ Per-cell save failed', { fieldKey, error: result.error });
            return { fieldKey, success: false, error: result.error };
          }
        } catch (error) {
          logger.error('💥 Per-cell save exception', { fieldKey, error });
          saveResults[fieldKey] = { success: false, error: 'Exception during save' };
          return { fieldKey, success: false, error };
        }
      }
    );

    const results = await Promise.all(savePromises);
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    // Log detailed results for debugging
    const failedSaves = results.filter(r => !r.success);
    if (failedSaves.length > 0) {
      logger.warn('Some per-cell saves failed', {
        failed: failedSaves.map(f => ({ key: f.fieldKey, error: f.error })),
        successful: successCount,
        total: totalCount
      });
    }

    logger.info('Per-cell save batch complete', {
      successCount,
      totalCount,
      success: successCount === totalCount,
      allResults: results.map(r => ({ key: r.fieldKey, success: r.success }))
    });

    // Return format expected by the hook consumers
    return {
      updatedAt: new Date().toISOString(),
      docVersion: Date.now() // Use timestamp as version for now
    };
  }, [
    isPerCellSaveEnabled,
    oldFieldDeltaSave,
    saveField,
    enablePerCellSaveForRundown,
    broadcastFieldUpdate
  ]);

  const initializeSavedState = useCallback((state: any) => {
    if (!isPerCellSaveEnabled) {
      return oldFieldDeltaSave.initializeSavedState(state);
    }
    
    // For new system, clear tracked changes
    trackingRef.current = {};
    logger.debug('Initialized per-cell save state');
  }, [isPerCellSaveEnabled, oldFieldDeltaSave]);

  return {
    saveDeltaState,
    trackFieldChange,
    initializeSavedState,
    isPerCellSaveEnabled // Expose for debugging
  };
};