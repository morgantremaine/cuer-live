import { useCallback, useRef } from 'react';
import { useUnifiedSaveState } from './useUnifiedSaveState';
import { isContentField, isUIPreferenceField } from '@/utils/unifiedContentSignature';
import { debugLogger } from '@/utils/debugLogger';

interface SaveCoordinationOptions {
  rundownId: string;
  isPerCellEnabled: boolean;
  onSaveComplete?: (timestamp?: string) => void;
  onSaveStart?: () => void;
  onUnsavedChanges?: () => void;
}

/**
 * UNIFIED save coordination system - replaces multiple overlapping coordination systems
 * Single source of truth for coordinating between per-cell and regular saves
 */
export const useUnifiedSaveCoordination = (options: SaveCoordinationOptions) => {
  const {
    rundownId,
    isPerCellEnabled,
    onSaveComplete,
    onSaveStart,
    onUnsavedChanges
  } = options;

  // Single save state manager
  const {
    saveState,
    markUnsavedChanges,
    markSaveStart,
    markSaveComplete,
    markSaveError,
    markTypingStart,
    markTypingStop,
    resetSaveState
  } = useUnifiedSaveState({
    onSaveComplete,
    onSaveStart,
    onUnsavedChanges
  });

  // Track which save system is handling what
  const activeSaveSystemRef = useRef<'per-cell' | 'autosave' | null>(null);
  const lastSaveTimestampRef = useRef<number>(0);

  // Unified field change tracking - routes to appropriate system
  const trackFieldChange = useCallback((
    itemId: string | undefined,
    fieldName: string,
    value: any,
    trackCellChange?: (itemId: string | undefined, field: string, value: any) => void,
    trackRegularChange?: () => void
  ) => {
    console.log('🔄 UNIFIED COORDINATION: Field change detected', {
      itemId: itemId || 'GLOBAL',
      fieldName,
      valueType: typeof value,
      isContentField: isContentField(fieldName),
      isUIField: isUIPreferenceField(fieldName),
      isPerCellEnabled,
      rundownId
    });

    // Determine if this is a content change
    const isContent = isContentField(fieldName);
    const isUIPreference = isUIPreferenceField(fieldName);

    if (isContent) {
      // Content changes always trigger unsaved state
      markUnsavedChanges();
      
      if (isPerCellEnabled && trackCellChange) {
        // Route to per-cell save system
        console.log('🔄 UNIFIED COORDINATION: Routing content change to per-cell system');
        activeSaveSystemRef.current = 'per-cell';
        trackCellChange(itemId, fieldName, value);
        debugLogger.autosave(`Per-cell coordination: ${fieldName} change tracked`);
      } else if (trackRegularChange) {
        // Route to regular autosave system
        console.log('🔄 UNIFIED COORDINATION: Routing content change to autosave system');
        activeSaveSystemRef.current = 'autosave';
        trackRegularChange();
        debugLogger.autosave(`Autosave coordination: ${fieldName} change tracked`);
      }
    } else if (isUIPreference) {
      // UI preference changes - handle based on system
      if (isPerCellEnabled && trackCellChange) {
        // Even UI preferences go through per-cell when enabled
        console.log('🔄 UNIFIED COORDINATION: Routing UI preference to per-cell system');
        markUnsavedChanges();
        trackCellChange(itemId, fieldName, value);
      } else {
        // UI preferences don't trigger content saves in regular mode
        console.log('🔄 UNIFIED COORDINATION: UI preference change - not triggering content save');
        debugLogger.autosave(`UI preference change: ${fieldName} (no content save needed)`);
      }
    } else {
      console.warn('🔄 UNIFIED COORDINATION: Unknown field type', { fieldName, value });
    }
  }, [isPerCellEnabled, markUnsavedChanges, rundownId]);

  // Unified save start coordination
  const coordinateSaveStart = useCallback((saveType: 'per-cell' | 'autosave' | 'manual') => {
    console.log('🔄 UNIFIED COORDINATION: Save starting', {
      saveType,
      activeSaveSystem: activeSaveSystemRef.current,
      rundownId
    });
    
    activeSaveSystemRef.current = saveType === 'manual' ? 'autosave' : saveType;
    markSaveStart();
    debugLogger.autosave(`Coordinated save start: ${saveType}`);
  }, [markSaveStart, rundownId]);

  // Unified save completion coordination
  const coordinateSaveComplete = useCallback((
    saveType: 'per-cell' | 'autosave' | 'manual',
    timestamp?: string
  ) => {
    console.log('🔄 UNIFIED COORDINATION: Save completed', {
      saveType,
      activeSaveSystem: activeSaveSystemRef.current,
      timestamp,
      rundownId
    });
    
    // Only mark complete if this was the active save system or it's a manual save
    const normalizedSaveType = saveType === 'manual' ? 'autosave' : saveType;
    if (activeSaveSystemRef.current === normalizedSaveType || saveType === 'manual') {
      markSaveComplete(timestamp);
      activeSaveSystemRef.current = null;
      lastSaveTimestampRef.current = Date.now();
      debugLogger.autosave(`Coordinated save completion: ${saveType}`);
    } else {
      console.log('🔄 UNIFIED COORDINATION: Ignoring save completion from inactive system', {
        completedBy: saveType,
        activeSystem: activeSaveSystemRef.current
      });
    }
  }, [markSaveComplete, rundownId]);

  // Unified save error coordination
  const coordinateSaveError = useCallback((
    saveType: 'per-cell' | 'autosave' | 'manual',
    error: string
  ) => {
    console.log('🔄 UNIFIED COORDINATION: Save error', {
      saveType,
      error,
      rundownId
    });
    
    markSaveError(error);
    activeSaveSystemRef.current = null;
    debugLogger.autosave(`Coordinated save error: ${saveType} - ${error}`);
  }, [markSaveError, rundownId]);

  // Typing coordination
  const coordinateTypingStart = useCallback(() => {
    markTypingStart();
  }, [markTypingStart]);

  const coordinateTypingStop = useCallback(() => {
    markTypingStop();
  }, [markTypingStop]);

  // Check if saves should be blocked
  const shouldBlockSave = useCallback((saveType: 'per-cell' | 'autosave' | 'manual') => {
    const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
    const hasActiveSave = activeSaveSystemRef.current !== null;
    const normalizedSaveType = saveType === 'manual' ? 'autosave' : saveType;
    const isConflictingSave = hasActiveSave && activeSaveSystemRef.current !== normalizedSaveType;

    // Manual saves should almost never be blocked
    if (saveType === 'manual') {
      return false;
    }

    // Block if there's a conflicting save in progress
    if (isConflictingSave) {
      console.log('🔄 UNIFIED COORDINATION: Blocking save due to conflict', {
        requestedSave: saveType,
        activeSave: activeSaveSystemRef.current
      });
      return true;
    }

    // Rate limiting for automatic saves (exclude manual saves from rate limiting)
    const isAutomaticSave = saveType === 'per-cell' || saveType === 'autosave';
    if (timeSinceLastSave < 500 && isAutomaticSave) {
      console.log('🔄 UNIFIED COORDINATION: Rate limiting save', {
        saveType,
        timeSinceLastSave
      });
      return true;
    }

    return false;
  }, []);

  // Legacy teleprompter save coordination (for backward compatibility)
  const coordinateTeleprompterSave = useCallback(async (
    saveFunction: () => Promise<void>,
    options?: { immediate?: boolean; onComplete?: (success: boolean) => void }
  ): Promise<boolean> => {
    if (shouldBlockSave('autosave')) {
      console.log('🔄 UNIFIED COORDINATION: Teleprompter save blocked');
      options?.onComplete?.(false);
      return false;
    }
    
    coordinateSaveStart('autosave');
    try {
      await saveFunction();
      coordinateSaveComplete('autosave');
      options?.onComplete?.(true);
      return true;
    } catch (error) {
      coordinateSaveError('autosave', error instanceof Error ? error.message : 'Teleprompter save failed');
      options?.onComplete?.(false);
      return false;
    }
  }, [shouldBlockSave, coordinateSaveStart, coordinateSaveComplete, coordinateSaveError]);

  return {
    // State
    saveState,
    isSaving: saveState.isSaving,
    hasUnsavedChanges: saveState.hasUnsavedChanges,
    
    // Field tracking
    trackFieldChange,
    
    // Save coordination
    coordinateSaveStart,
    coordinateSaveComplete,
    coordinateSaveError,
    coordinateTeleprompterSave, // Legacy method for backward compatibility
    
    // Typing coordination
    coordinateTypingStart,
    coordinateTypingStop,
    
    // Utilities
    shouldBlockSave,
    resetSaveState,
    
    // System status
    getActiveSaveSystem: () => activeSaveSystemRef.current,
    getLastSaveTimestamp: () => lastSaveTimestampRef.current
  };
};