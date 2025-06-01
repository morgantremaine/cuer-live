
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

// Simplified global tracker for change tracking
let globalChangeTrackingInitialized = new Set<string>();

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Initialize tracking after first meaningful load
  useEffect(() => {
    const initKey = `${rundownTitle}-${items.length}`;
    
    // Only initialize once we have meaningful data and haven't initialized yet
    if (!initRef.current && !globalChangeTrackingInitialized.has(initKey) && 
        (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      
      console.log('Change tracking initialized with title:', rundownTitle);
      
      const signature = JSON.stringify({ items, title: rundownTitle, columns });
      lastSavedDataRef.current = signature;
      initRef.current = true;
      globalChangeTrackingInitialized.add(initKey);
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items, rundownTitle, columns]);

  // Track changes after initialization - but only if not loading
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = JSON.stringify({ items, title: rundownTitle, columns });
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', { title: rundownTitle, hasChanges });
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[]) => {
    const signature = JSON.stringify({ items: savedItems, title: savedTitle, columns: savedColumns });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved with title:', savedTitle);
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
