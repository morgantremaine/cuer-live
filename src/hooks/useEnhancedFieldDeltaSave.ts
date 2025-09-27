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
    if (!itemId) {
      logger.warn('🚫 Per-cell tracking skipped - no itemId', { fieldName, value });
      return;
    }
    
    const fieldKey = `${itemId}.${fieldName}`;
    trackingRef.current[fieldKey] = {
      itemId,
      fieldName,
      value,
      timestamp: Date.now()
    };

    logger.info('🎯 Per-cell tracking field change', {
      itemId,
      fieldName,
      fieldKey,
      currentTrackedCount: Object.keys(trackingRef.current).length
    });
  }, [isPerCellSaveEnabled, oldFieldDeltaSave?.trackFieldChange]);

  const saveDeltaState = useCallback(async (currentState: any): Promise<{ updatedAt: string; docVersion: number; }> => {
    logger.info('🔄 saveDeltaState called', {
      isPerCellSaveEnabled,
      trackedFieldsCount: Object.keys(trackingRef.current).length,
      trackedFields: Object.keys(trackingRef.current)
    });

    // TEMPORARY: Always use old system to prevent crashes during testing
    logger.info('📝 Using old field delta save system (testing mode)');
    return oldFieldDeltaSave.saveDeltaState(currentState);

  }, [
    oldFieldDeltaSave?.saveDeltaState
  ]);

  const initializeSavedState = useCallback((state: any) => {
    if (!isPerCellSaveEnabled) {
      // Add safety check to prevent crashes
      if (oldFieldDeltaSave && oldFieldDeltaSave.initializeSavedState) {
        return oldFieldDeltaSave.initializeSavedState(state);
      } else {
        logger.warn('oldFieldDeltaSave.initializeSavedState not available yet');
        return;
      }
    }
    
    // For new system, clear tracked changes
    trackingRef.current = {};
    logger.debug('Initialized per-cell save state');
  }, [isPerCellSaveEnabled, oldFieldDeltaSave?.initializeSavedState]);

  return {
    saveDeltaState,
    trackFieldChange,
    initializeSavedState,
    isPerCellSaveEnabled // Expose for debugging
  };
};