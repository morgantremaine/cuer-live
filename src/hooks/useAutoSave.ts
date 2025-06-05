
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const saveInProgressRef = useRef(false);
  const lastSaveAttemptRef = useRef<number>(0);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime);

  // Stable debounced save function with rate limiting
  const debouncedSave = useCallback(async (itemsToSave: RundownItem[], titleToSave: string, columnsToSave?: Column[], timezoneToSave?: string, startTimeToSave?: string) => {
    const now = Date.now();
    
    // Rate limiting - prevent saves within 5 seconds of each other
    if (now - lastSaveAttemptRef.current < 5000) {
      console.log('Save rate limited');
      return;
    }

    if (!user || saveInProgressRef.current) {
      return;
    }

    // Prevent overlapping saves
    saveInProgressRef.current = true;
    setIsLoading(true);
    lastSaveAttemptRef.current = now;

    try {
      const success = await performSave(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      
      if (success) {
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      saveInProgressRef.current = false;
    }
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading]);

  // Auto-save effect with stronger guards
  useEffect(() => {
    // Don't save if not initialized, no changes, no user, or save in progress
    if (!hasUnsavedChanges || !isInitialized || !user || saveInProgressRef.current) {
      return;
    }

    // Don't save if we don't have meaningful data
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    // Create signature to avoid duplicate saves
    const currentDataSignature = JSON.stringify({ 
      itemsCount: items.length, 
      title: rundownTitle, 
      columnsCount: columns?.length || 0, 
      timezone, 
      startTime,
      timestamp: Math.floor(Date.now() / 10000) // Round to 10 second intervals
    });
    
    // Skip if this exact data was already saved recently
    if (lastSaveDataRef.current === currentDataSignature) {
      return;
    }

    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule save with longer debounce to prevent spam
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);
      debounceTimeoutRef.current = null;
    }, 5000); // Longer delay to prevent excessive saves

  }, [hasUnsavedChanges, isInitialized, user, items, rundownTitle, columns, timezone, startTime, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving: isSaving || saveInProgressRef.current,
    markAsChanged
  };
};
