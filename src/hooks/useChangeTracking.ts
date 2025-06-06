
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const initializationCompleteRef = useRef(false);

  // Simple initialization - just wait for meaningful data
  useEffect(() => {
    if (initializationCompleteRef.current) return;

    const hasMeaningfulData = items.length > 0 && rundownTitle !== 'Live Broadcast Rundown';
    
    if (hasMeaningfulData && !isLoadingRef.current) {
      const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
      lastSavedDataRef.current = signature;
      initializationCompleteRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      console.log('Change tracking initialized successfully');
    }
  }, [items.length, rundownTitle, columns, timezone, startTime]);

  // Track changes only after initialization
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current || !initializationCompleteRef.current) {
      return;
    }

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', hasChanges ? 'UNSAVED' : 'SAVED');
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved');
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && initializationCompleteRef.current) {
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    console.log(loading ? 'Setting loading mode' : 'Loading complete');
  };

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized: initializationCompleteRef.current,
    setIsLoading
  };
};
