
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false); // Prevent multiple initializations

  // Create a stable signature for tracking changes
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      itemsCount: items.length,
      itemsData: items.slice(0, 3).map(item => ({ id: item.id, name: item.segmentName || item.name, duration: item.duration })),
      title: rundownTitle, 
      columnsCount: columns?.length || 0,
      timezone, 
      startTime 
    });
  }, [items, rundownTitle, columns?.length, timezone, startTime]);

  // Initialize tracking once - PREVENT MULTIPLE INITIALIZATIONS
  useEffect(() => {
    if (hasInitializedRef.current || isInitialized || isLoadingRef.current) {
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have some data
    const hasData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    if (hasData) {
      // Mark that we've started initialization to prevent duplicates
      hasInitializedRef.current = true;
      
      initializationTimeoutRef.current = setTimeout(() => {
        if (!isInitialized && !isLoadingRef.current) {
          lastSavedDataRef.current = currentSignature;
          setIsInitialized(true);
          setHasUnsavedChanges(false);
          console.log('Change tracking initialized ONCE with signature:', currentSignature.substring(0, 100));
        }
      }, 1000);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [currentSignature, isInitialized, items.length, rundownTitle]);

  // Track changes after initialization - SIMPLIFIED
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current || !hasInitializedRef.current) {
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    // Only update if there's actually a change in state
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentSignature, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      itemsCount: savedItems.length,
      itemsData: savedItems.slice(0, 3).map(item => ({ id: item.id, name: item.segmentName || item.name, duration: item.duration })),
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
    if (!isLoadingRef.current && isInitialized && hasInitializedRef.current) {
      console.log('Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    console.log('Setting loading state:', loading);
    isLoadingRef.current = loading;
    if (loading) {
      // Reset initialization state when loading starts
      hasInitializedRef.current = false;
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
