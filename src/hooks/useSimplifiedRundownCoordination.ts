import { useDirectRundownState } from './useDirectRundownState';
import { useUserPresence } from './useUserPresence';
import { useCellLevelSave } from './useCellLevelSave';
import { useAuth } from './useAuth';
import { useCallback, useRef, useState, useEffect } from 'react';
import { RundownItem } from './useRundownItems';
import { isTextField } from '@/utils/fieldClassification';

interface SimplifiedRundownCoordinationProps {
  rundownId: string;
}

export const useSimplifiedRundownCoordination = ({ rundownId }: SimplifiedRundownCoordinationProps) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  // Core state management with direct saves
  const directState = useDirectRundownState({
    rundownId,
    userId,
    onDataLoaded: (items, title) => {
      console.log('✅ Rundown data loaded:', { itemCount: items.length, title });
    }
  });

  // User presence for "teammate editing" indicators
  const presence = useUserPresence({ rundownId, enabled: true });

  // Text field debouncing with cell-level saves
  const saveInProgressRef = useRef(false);
  const cellSave = useCellLevelSave(
    rundownId,
    () => {
      console.log('✅ Cell save complete');
      saveInProgressRef.current = false;
    },
    () => {
      console.log('💾 Cell save started');
      saveInProgressRef.current = true;
    },
    () => {
      // Unsaved changes callback
    },
    () => {
      // Changes saved callback
    },
    undefined,
    saveInProgressRef,
    800 // 800ms debounce for text fields
  );

  // Track pending text field updates
  const pendingTextUpdates = useRef<Map<string, { itemId: string; field: string; value: any }>>(new Map());
  const textFieldTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle text field updates with debouncing
  const handleTextFieldUpdate = useCallback((itemId: string, field: string, value: any) => {
    const key = `${itemId}.${field}`;
    
    // Clear existing timeout
    const existingTimeout = textFieldTimeouts.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Store pending update
    pendingTextUpdates.current.set(key, { itemId, field, value });

    // Optimistic local update
    directState.updateItem(itemId, field, value);

    // Debounced save
    const timeout = setTimeout(() => {
      cellSave.trackCellChange(itemId, field, value);
      pendingTextUpdates.current.delete(key);
      textFieldTimeouts.current.delete(key);
    }, 800);

    textFieldTimeouts.current.set(key, timeout);
  }, [directState, cellSave]);

  // Handle immediate (non-text) field updates
  const handleImmediateFieldUpdate = useCallback((itemId: string, field: string, value: any) => {
    // Optimistic local update + immediate save
    directState.updateItem(itemId, field, value);
    
    // The updateItem function returns a save function
    const saveFn = directState.updateItem(itemId, field, value);
    saveFn(); // Execute immediate save
  }, [directState]);

  // Unified update handler
  const updateItem = useCallback((itemId: string, field: string, value: any) => {
    if (isTextField(field)) {
      handleTextFieldUpdate(itemId, field, value);
    } else {
      handleImmediateFieldUpdate(itemId, field, value);
    }
  }, [handleTextFieldUpdate, handleImmediateFieldUpdate]);

  // Flush pending text changes (on blur or navigation)
  const flushPendingChanges = useCallback(async () => {
    // Clear all pending timeouts
    for (const timeout of textFieldTimeouts.current.values()) {
      clearTimeout(timeout);
    }
    textFieldTimeouts.current.clear();

    // Save all pending text updates
    if (pendingTextUpdates.current.size > 0) {
      await cellSave.flushPendingUpdates();
      pendingTextUpdates.current.clear();
    }
  }, [cellSave]);

  // Combined save state
  const saveState = {
    isSaving: directState.isSaving || saveInProgressRef.current,
    hasUnsavedChanges: directState.hasUnsavedChanges || pendingTextUpdates.current.size > 0,
    lastSaved: directState.lastSavedAt,
    saveError: null
  };

  return {
    // Data
    items: directState.items,
    title: directState.title,
    isLoading: directState.isLoading,
    
    // Save state for UI indicators
    saveState,
    
    // Actions
    updateItem,
    addRow: directState.addRow,
    deleteRow: directState.deleteRow,
    moveRow: directState.moveRow,
    setTitle: directState.setTitle,
    flushPendingChanges,
    saveNow: directState.saveNow,
    
    // Presence
    otherUsers: presence.otherUsers,
    hasSessionConflict: presence.hasSessionConflict
  };
};
