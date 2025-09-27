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
    if (!isPerCellSaveEnabled) {
      // Route to old system
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
      // Route to old system
      logger.debug('Using old field delta save system');
      return oldFieldDeltaSave.saveDeltaState(currentState);
    }

    // New per-cell save system
    logger.info('Using new per-cell save system', {
      trackedFields: Object.keys(trackingRef.current).length
    });

    // First ensure per-cell save is enabled for this rundown
    await enablePerCellSaveForRundown();

    // Save each tracked field individually
    const savePromises = Object.entries(trackingRef.current).map(
      async ([fieldKey, { itemId, fieldName, value }]) => {
        try {
          const result = await saveField(itemId, fieldName, value);
          if (result.success) {
            logger.debug('Field saved successfully', { fieldKey });
            delete trackingRef.current[fieldKey];
            return true;
          } else {
            logger.warn('Field save failed', { fieldKey, error: result.error });
            return false;
          }
        } catch (error) {
          logger.error('Field save exception', { fieldKey, error });
          return false;
        }
      }
    );

    const results = await Promise.all(savePromises);
    const successCount = results.filter(Boolean).length;
    const totalCount = results.length;

    logger.info('Per-cell save batch complete', {
      successCount,
      totalCount,
      success: successCount === totalCount
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