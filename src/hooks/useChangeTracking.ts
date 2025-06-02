
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initialLoadRef = useRef(false);
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignatureRef = useRef<string>('');

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
        const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
        lastSavedDataRef.current = signature;
        lastSignatureRef.current = signature;
        initialLoadRef.current = true;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Change tracking initialized with title:', rundownTitle, 'timezone:', timezone, 'startTime:', startTime);
      }, 200); // Increased delay to prevent rapid re-initialization
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items.length, rundownTitle]); // Reduced dependencies to prevent excessive re-runs

  // Track changes after initialization - but only if not loading
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    
    // Only update if signature actually changed
    if (lastSignatureRef.current !== currentSignature) {
      const hasChanges = lastSavedDataRef.current !== currentSignature;
      lastSignatureRef.current = currentSignature;
      
      if (hasChanges !== hasUnsavedChanges) {
        console.log('Change detected:', { title: rundownTitle, timezone, startTime, hasChanges });
        setHasUnsavedChanges(hasChanges);
      }
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    lastSignatureRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved with title:', savedTitle, 'timezone:', savedTimezone, 'startTime:', savedStartTime);
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
