
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
  const hasInitializedOnceRef = useRef(false);
  const lastInitializationKeyRef = useRef<string>('');

  // Initialize tracking after first meaningful load with delay
  useEffect(() => {
    // Create a key to track initialization
    const initKey = `${rundownTitle}-${items.length}-${columns?.length || 0}`;
    
    // Skip if already initialized with this exact data
    if (lastInitializationKeyRef.current === initKey && hasInitializedOnceRef.current) {
      return;
    }

    // Clear any pending initialization
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have meaningful data and haven't initialized yet
    if (!initialLoadRef.current && (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      // Add a small delay to prevent initialization during rapid state changes
      initializationTimeoutRef.current = setTimeout(() => {
        const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
        lastSavedDataRef.current = signature;
        lastInitializationKeyRef.current = initKey;
        initialLoadRef.current = true;
        hasInitializedOnceRef.current = true;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Change tracking initialized');
      }, 200);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items.length, rundownTitle, columns?.length, timezone, startTime]); // Use length-based dependencies

  // Track changes after initialization - but only if not loading
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current) {
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
