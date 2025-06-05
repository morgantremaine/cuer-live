
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializationRef = useRef(false);

  // Create a simple signature for change tracking
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      itemsCount: items.length,
      title: rundownTitle, 
      columnsCount: columns?.length || 0,
      timezone, 
      startTime,
      // Sample of items for change detection
      itemsSample: items.slice(0, 2).map(item => ({ 
        id: item.id, 
        name: item.segmentName || item.name
      }))
    });
  }, [items.length, rundownTitle, columns?.length, timezone, startTime, items]);

  // Initialize ONCE when we have meaningful data
  useEffect(() => {
    if (!initializationRef.current && (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      console.log('Change tracking: Initializing');
      lastSavedDataRef.current = currentSignature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      initializationRef.current = true;
    }
  }, [currentSignature, items.length, rundownTitle]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    setHasUnsavedChanges(hasChanges);
  }, [currentSignature, isInitialized]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      itemsCount: savedItems.length,
      title: savedTitle, 
      columnsCount: savedColumns?.length || 0, 
      timezone: savedTimezone, 
      startTime: savedStartTime,
      itemsSample: savedItems.slice(0, 2).map(item => ({ 
        id: item.id, 
        name: item.segmentName || item.name
      }))
    });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Change tracking: Marked as saved');
  };

  const markAsChanged = () => {
    if (isInitialized) {
      console.log('Change tracking: Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    console.log('Change tracking: Setting loading state:', loading);
    if (loading) {
      // Reset initialization when starting to load new data
      initializationRef.current = false;
      setIsInitialized(false);
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
