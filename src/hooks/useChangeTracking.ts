
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Initialize tracking when we have data (don't wait for specific title)
  useEffect(() => {
    if (isInitialized || isLoadingRef.current) return;

    // Initialize when we have any meaningful data
    if (items.length > 0 || (rundownTitle && rundownTitle.trim() !== '')) {
      const signature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
      lastSavedDataRef.current = signature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      console.log('Change tracking initialized with', items.length, 'items');
    }
  }, [items.length, rundownTitle, isInitialized]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) {
      return;
    }

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
      console.log('Change detected:', hasChanges ? 'UNSAVED' : 'SAVED');
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns, timezone: savedTimezone, startTime: savedStartTime });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved');
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && isInitialized) {
      setHasUnsavedChanges(true);
      console.log('Manually marked as changed');
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
    isInitialized,
    setIsLoading
  };
};
