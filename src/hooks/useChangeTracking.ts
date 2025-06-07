
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (
  items: RundownItem[], 
  rundownTitle: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string
) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const lastSavedDataRef = useRef<string>('');
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a stable signature for the current data
  const createDataSignature = useCallback(() => {
    return JSON.stringify({
      items: items || [],
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Initialize tracking after a short delay to avoid initial change detection
  useEffect(() => {
    if (!isInitialized) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Set a timeout to initialize after data has settled
      initializationTimeoutRef.current = setTimeout(() => {
        const currentSignature = createDataSignature();
        lastSavedDataRef.current = currentSignature;
        setIsInitialized(true);
        console.log('Change tracking initialized');
      }, 500);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createDataSignature]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }

    const currentSignature = createDataSignature();
    
    if (lastSavedDataRef.current !== currentSignature) {
      console.log('📝 Data changed - marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, createDataSignature]);

  const markAsSaved = useCallback((
    savedItems: RundownItem[], 
    savedTitle: string, 
    savedColumns?: Column[], 
    savedTimezone?: string, 
    savedStartTime?: string
  ) => {
    const savedSignature = JSON.stringify({
      items: savedItems || [],
      title: savedTitle || '',
      columns: savedColumns || [],
      timezone: savedTimezone || '',
      startTime: savedStartTime || ''
    });
    
    lastSavedDataRef.current = savedSignature;
    setHasUnsavedChanges(false);
    console.log('✅ Marked as saved');
  }, []);

  const markAsChanged = useCallback(() => {
    if (isInitialized && !isLoading) {
      console.log('📝 Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  }, [isInitialized, isLoading]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading
  };
};
