
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

type AutoSaveState = 'idle' | 'detecting' | 'saving' | 'saved' | 'error';

export const useStableAutoSave = (
  rundownId: string | null,
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string
) => {
  const { updateRundown } = useRundownStorage();
  const [state, setState] = useState<AutoSaveState>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs to prevent infinite loops
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Create a stable data signature for change detection
  const createDataSignature = useCallback(() => {
    return JSON.stringify({
      items: items || [],
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: rundownStartTime || ''
    });
  }, [items, rundownTitle, columns, timezone, rundownStartTime]);

  // Stable save function
  const performSave = useCallback(async () => {
    if (!rundownId || isSavingRef.current || !isDirtyRef.current) {
      console.log('💾 Skipping save:', { 
        hasRundownId: !!rundownId, 
        isSaving: isSavingRef.current, 
        isDirty: isDirtyRef.current 
      });
      return;
    }

    console.log('💾 Starting auto-save...');
    setState('saving');
    isSavingRef.current = true;

    try {
      await updateRundown(
        rundownId,
        rundownTitle,
        items,
        true, // silent
        false, // not archived
        columns,
        timezone,
        rundownStartTime
      );

      // Mark as saved
      lastSavedDataRef.current = createDataSignature();
      isDirtyRef.current = false;
      setHasUnsavedChanges(false);
      setState('saved');
      console.log('✅ Auto-save completed successfully');

      // Reset to idle after a short delay
      setTimeout(() => {
        if (!isDirtyRef.current) {
          setState('idle');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      setState('error');
      // Reset to detecting after error to try again
      setTimeout(() => setState('detecting'), 2000);
    } finally {
      isSavingRef.current = false;
    }
  }, [rundownId, rundownTitle, items, columns, timezone, rundownStartTime, updateRundown, createDataSignature]);

  // Mark as dirty (trigger save)
  const markAsDirty = useCallback(() => {
    if (!isInitializedRef.current) return;
    
    console.log('🔄 Marking as dirty');
    isDirtyRef.current = true;
    setHasUnsavedChanges(true);
    setState('detecting');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save with proper debouncing
    saveTimeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current && !isSavingRef.current) {
        performSave();
      }
    }, 2000);
  }, [performSave]);

  // Initialize with current data
  useEffect(() => {
    if (items && items.length >= 0 && !isInitializedRef.current) {
      console.log('🎯 Initializing stable auto-save with', items.length, 'items');
      lastSavedDataRef.current = createDataSignature();
      isInitializedRef.current = true;
      setState('idle');
    }
  }, [items, createDataSignature]);

  // Detect changes (only when initialized)
  useEffect(() => {
    if (!isInitializedRef.current || isSavingRef.current) return;

    const currentSignature = createDataSignature();
    
    if (lastSavedDataRef.current && lastSavedDataRef.current !== currentSignature) {
      if (!isDirtyRef.current) {
        console.log('🚨 Changes detected, marking as dirty');
        markAsDirty();
      }
    }
  }, [createDataSignature, markAsDirty]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving: state === 'saving',
    autoSaveState: state,
    markAsDirty
  };
};
