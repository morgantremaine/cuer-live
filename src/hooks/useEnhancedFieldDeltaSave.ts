import { useCallback, useRef } from 'react';
import { useFieldDeltaSave } from './useFieldDeltaSave';
import { usePerCellSave } from './usePerCellSave';
import { usePerCellSaveFeatureFlag } from './usePerCellSaveFeatureFlag';
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

  const trackFieldChange = useCallback((itemId: string | undefined, fieldName: string, value: any) => {
    console.log('🧪 PER-CELL SAVE: trackFieldChange called', {
      itemId,
      fieldName,
      isPerCellSaveEnabled,
      value: typeof value === 'string' ? value.substring(0, 50) + '...' : value
    });
    
    if (!isPerCellSaveEnabled) {
      // Route to old system
      console.log('🧪 PER-CELL SAVE: Routing to old system');
      return oldFieldDeltaSave.trackFieldChange(itemId, fieldName, value);
    }

    console.log('🧪 PER-CELL SAVE: Using new per-cell save system');
    
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
    console.log('🧪 PER-CELL SAVE: saveDeltaState called', {
      isPerCellSaveEnabled,
      trackedFieldsCount: Object.keys(trackingRef.current).length,
      trackedFields: Object.keys(trackingRef.current)
    });
    
    if (!isPerCellSaveEnabled) {
      // Route to old system
      console.log('🧪 PER-CELL SAVE: Routing to old delta save system');
      return oldFieldDeltaSave.saveDeltaState(currentState);
    }

    // Check if we have tracked fields to save
    const trackedFieldsCount = Object.keys(trackingRef.current).length;
    if (trackedFieldsCount === 0) {
      console.log('🧪 PER-CELL SAVE: No tracked fields to save, falling back to old system');
      return oldFieldDeltaSave.saveDeltaState(currentState);
    }

    // New per-cell save system
    console.log('🧪 PER-CELL SAVE: Starting per-cell save process', {
      trackedFields: Object.keys(trackingRef.current)
    });
    logger.info('Using new per-cell save system', {
      trackedFields: Object.keys(trackingRef.current).length
    });

    // First ensure per-cell save is enabled for this rundown
    console.log('🧪 PER-CELL SAVE: Enabling per-cell save for rundown');
    await enablePerCellSaveForRundown();

    // Save each tracked field individually
    console.log('🧪 PER-CELL SAVE: Creating save promises for tracked fields');
    const savePromises = Object.entries(trackingRef.current).map(
      async ([fieldKey, { itemId, fieldName, value }]) => {
        try {
          console.log('🧪 PER-CELL SAVE: Saving field', { fieldKey, itemId, fieldName });
          const result = await saveField(itemId, fieldName, value);
          console.log('🧪 PER-CELL SAVE: Field save result', { fieldKey, success: result.success, error: result.error });
          if (result.success) {
            logger.debug('Field saved successfully', { fieldKey });
            delete trackingRef.current[fieldKey];
            return true;
          } else {
            logger.warn('Field save failed', { fieldKey, error: result.error });
            return false;
          }
        } catch (error) {
          console.log('🧪 PER-CELL SAVE: Field save exception', { fieldKey, error });
          logger.error('Field save exception', { fieldKey, error });
          return false;
        }
      }
    );

    console.log('🧪 PER-CELL SAVE: Waiting for all save promises to complete');
    const results = await Promise.all(savePromises);
    const successCount = results.filter(Boolean).length;
    const totalCount = results.length;

    console.log('🧪 PER-CELL SAVE: All saves completed', {
      successCount,
      totalCount,
      success: successCount === totalCount
    });

    logger.info('Per-cell save batch complete', {
      successCount,
      totalCount,
      success: successCount === totalCount
    });

    // Return format expected by the hook consumers
    const result = {
      updatedAt: new Date().toISOString(),
      docVersion: Date.now() // Use timestamp as version for now
    };
    
    console.log('🧪 PER-CELL SAVE: Returning result', result);
    return result;
  }, [
    isPerCellSaveEnabled,
    oldFieldDeltaSave,
    saveField,
    enablePerCellSaveForRundown
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