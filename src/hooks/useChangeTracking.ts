
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
  const lastChangeCheckRef = useRef<string>('');

  // Initialize tracking after first meaningful load with delay
  useEffect(() => {
    // Skip if already initialized with meaningful data
    if (hasInitializedOnceRef.current && initialLoadRef.current) {
      return;
    }

    // Clear any pending initialization
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have meaningful data
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    if (!initialLoadRef.current && hasMeaningfulData) {
      // Add a delay to prevent initialization during rapid state changes
      initializationTimeoutRef.current = setTimeout(() => {
        const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
        lastSavedDataRef.current = signature;
        lastChangeCheckRef.current = signature;
        initialLoadRef.current = true;
        hasInitializedOnceRef.current = true;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Change tracking initialized');
      }, 300); // Increased delay to prevent race conditions
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items.length > 0, rundownTitle, columns?.length]); // Better dependency tracking

  // Track changes after initialization - but only if not loading
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    
    // Only check for changes if the signature actually changed
    if (lastChangeCheckRef.current !== currentSignature) {
      const hasChanges = lastSavedDataRef.current !== currentSignature;
      lastChangeCheckRef.current = currentSignature;
      
      if (hasChanges !== hasUnsavedChanges) {
        console.log('Change detected:', hasChanges ? 'UNSAVED' : 'SAVED');
        setHasUnsavedChanges(hasChanges);
      }
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    lastChangeCheckRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved');
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && isInitialized) {
      console.log('Marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    if (loading) {
      console.log('Setting loading mode - changes will be ignored');
    }
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
