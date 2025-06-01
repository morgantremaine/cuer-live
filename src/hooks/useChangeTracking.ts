
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initialLoadRef = useRef(false);
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize tracking after first meaningful load with delay
  useEffect(() => {
    // Clear any pending initialization
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have meaningful data
    if (!initialLoadRef.current && (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      // Add a small delay to prevent initialization during rapid state changes
      initializationTimeoutRef.current = setTimeout(() => {
        const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone });
        lastSavedDataRef.current = signature;
        initialLoadRef.current = true;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Change tracking initialized with title:', rundownTitle, 'timezone:', timezone);
      }, 100);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items, rundownTitle, columns, timezone]);

  // Track changes after initialization - but only if not loading
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', { title: rundownTitle, timezone, hasChanges });
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved with title:', savedTitle, 'timezone:', savedTimezone);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current) {
      console.log('Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
  };

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading
  };
};
