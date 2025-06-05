
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a stable signature for tracking changes
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      itemsCount: items.length,
      itemsData: items.slice(0, 3).map(item => ({ 
        id: item.id, 
        name: item.segmentName || item.name, 
        duration: item.duration 
      })),
      title: rundownTitle, 
      columnsCount: columns?.length || 0,
      timezone, 
      startTime 
    });
  }, [items, rundownTitle, columns?.length, timezone, startTime]);

  // Initialize tracking ONCE
  useEffect(() => {
    if (isInitialized || isLoadingRef.current) {
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize if we have meaningful data
    const hasData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    if (hasData) {
      initializationTimeoutRef.current = setTimeout(() => {
        if (!isInitialized && !isLoadingRef.current) {
          lastSavedDataRef.current = currentSignature;
          setIsInitialized(true);
          setHasUnsavedChanges(false);
          console.log('Change tracking initialized with data');
        }
      }, 500); // Reduced timeout
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [currentSignature, isInitialized, items.length, rundownTitle]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current) {
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentSignature, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      itemsCount: savedItems.length,
      itemsData: savedItems.slice(0, 3).map(item => ({ 
        id: item.id, 
        name: item.segmentName || item.name, 
        duration: item.duration 
      })),
      title: savedTitle, 
      columnsCount: savedColumns?.length || 0, 
      timezone: savedTimezone, 
      startTime: savedStartTime 
    });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved');
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && isInitialized) {
      console.log('Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    console.log('Setting loading state:', loading);
    isLoadingRef.current = loading;
    if (loading) {
      // Reset initialization when loading starts
      setIsInitialized(false);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
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
