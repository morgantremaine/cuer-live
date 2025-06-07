
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

type AutoSaveState = 'idle' | 'detecting' | 'saving' | 'saved' | 'error' | 'permission-denied';

export const useStableAutoSave = (
  rundownId: string | null,
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string
) => {
  const { updateRundown, saveRundown } = useRundownStorage();
  const [state, setState] = useState<AutoSaveState>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs to prevent infinite loops
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);
  const hasTriedSaveRef = useRef(false);
  const onRundownCreatedRef = useRef<((id: string) => void) | null>(null);

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

  // Function to set callback for when rundown is created
  const setOnRundownCreated = useCallback((callback: (id: string) => void) => {
    onRundownCreatedRef.current = callback;
  }, []);

  // Helper function to check if rundownId is valid
  const isValidRundownId = useCallback((id: string | null): id is string => {
    return id !== null && id !== 'new' && id !== ':id' && id.trim() !== '';
  }, []);

  // Stable save function
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !isDirtyRef.current) {
      console.log('💾 Skipping save:', { 
        isSaving: isSavingRef.current, 
        isDirty: isDirtyRef.current 
      });
      return;
    }

    // If no valid rundownId and we have items, create a new rundown
    if (!isValidRundownId(rundownId) && items && items.length > 0 && !hasTriedSaveRef.current) {
      console.log('💾 Creating new rundown for unsaved content...');
      setState('saving');
      isSavingRef.current = true;
      hasTriedSaveRef.current = true;

      try {
        const newRundownData = await saveRundown(
          rundownTitle || 'New Rundown',
          items,
          columns,
          timezone,
          rundownStartTime
        );

        if (newRundownData && newRundownData.length > 0) {
          const newRundownId = newRundownData[0].id;
          console.log('✅ New rundown created:', newRundownId);
          
          // Mark as saved
          lastSavedDataRef.current = createDataSignature();
          isDirtyRef.current = false;
          setHasUnsavedChanges(false);
          setState('saved');

          // Notify that rundown was created (this will update the URL and rundown ID)
          if (onRundownCreatedRef.current) {
            onRundownCreatedRef.current(newRundownId);
          }

          // Reset to idle after a short delay
          setTimeout(() => {
            if (!isDirtyRef.current) {
              setState('idle');
            }
          }, 1000);
          
          return;
        }
      } catch (error) {
        console.error('❌ Failed to create new rundown:', error);
        setState('error');
        setTimeout(() => setState('detecting'), 2000);
      } finally {
        isSavingRef.current = false;
      }
      return;
    }

    // Skip if no valid rundown ID and no content to save
    if (!isValidRundownId(rundownId)) {
      console.log('💾 Skipping save: no valid rundownId and no content to create new rundown');
      return;
    }

    console.log('💾 Starting auto-save for existing rundown...');
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

    } catch (error: any) {
      console.error('❌ Auto-save failed:', error);
      
      // Check if it's a permission error
      if (error?.message?.includes('permission') || error?.message?.includes('modify')) {
        console.log('🚫 Permission denied - user cannot modify this rundown');
        setState('permission-denied');
        // Don't retry permission errors
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
      } else {
        setState('error');
        // Reset to detecting after error to try again
        setTimeout(() => setState('detecting'), 2000);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [rundownId, rundownTitle, items, columns, timezone, rundownStartTime, updateRundown, saveRundown, createDataSignature, isValidRundownId]);

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

  // Reset when rundown changes
  useEffect(() => {
    hasTriedSaveRef.current = false;
  }, [rundownId]);

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
    markAsDirty,
    setOnRundownCreated
  };
};
