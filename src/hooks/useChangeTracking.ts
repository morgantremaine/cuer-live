
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
  const previousSignatureRef = useRef<string>('');

  // Initialize tracking after first meaningful load with delay
  useEffect(() => {
    const initKey = `${rundownTitle}-${items.length}-${columns?.length || 0}`;
    
    if (lastInitializationKeyRef.current === initKey && hasInitializedOnceRef.current) {
      return;
    }

    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    if (!initialLoadRef.current && (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      initializationTimeoutRef.current = setTimeout(() => {
        const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
        lastSavedDataRef.current = signature;
        previousSignatureRef.current = signature;
        lastInitializationKeyRef.current = initKey;
        initialLoadRef.current = true;
        hasInitializedOnceRef.current = true;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Change tracking initialized');
      }, 300); // Increased delay to prevent rapid re-initializations
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items.length, rundownTitle, columns?.length, timezone, startTime]);

  // Track changes after initialization - with debouncing
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    
    // Only update if signature actually changed
    if (currentSignature === previousSignatureRef.current) {
      return;
    }
    
    previousSignatureRef.current = currentSignature;
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    previousSignatureRef.current = signature;
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
