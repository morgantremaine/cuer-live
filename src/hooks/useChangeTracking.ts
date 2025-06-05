
import { useState, useEffect, useRef, useMemo } from 'react';
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
  const initializationInProgressRef = useRef(false);

  // Create a stable signature that only changes when actual data changes
  const currentSignature = useMemo(() => {
    // Only create signature if we have meaningful data
    if (!Array.isArray(items) || items.length === 0) {
      return JSON.stringify({ empty: true, title: rundownTitle });
    }
    
    const signature = JSON.stringify({ 
      itemsCount: items.length,
      itemsHash: items.map(item => ({ id: item.id, name: item.name, duration: item.duration })).slice(0, 3),
      title: rundownTitle, 
      columnsCount: columns?.length || 0,
      timezone, 
      startTime 
    });
    
    return signature;
  }, [items.length, rundownTitle, columns?.length, timezone, startTime]);

  // Initialize tracking with stronger debounce and guards
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationInProgressRef.current || initialLoadRef.current || isLoadingRef.current) {
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have meaningful data
    const hasData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    if (hasData) {
      initializationInProgressRef.current = true;
      
      initializationTimeoutRef.current = setTimeout(() => {
        // Double check we haven't already initialized
        if (!initialLoadRef.current && !isLoadingRef.current) {
          lastSavedDataRef.current = currentSignature;
          lastSignatureRef.current = currentSignature;
          initialLoadRef.current = true;
          setIsInitialized(true);
          setHasUnsavedChanges(false);
          console.log('Change tracking initialized (stable)');
        }
        initializationInProgressRef.current = false;
      }, 2000); // Longer delay for stability
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [currentSignature, items.length, rundownTitle]);

  // Track changes only after initialization and if signature actually changed
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current || initializationInProgressRef.current || currentSignature === lastSignatureRef.current) {
      return;
    }

    // Add additional delay to prevent rapid changes during loading
    const changeTimeout = setTimeout(() => {
      lastSignatureRef.current = currentSignature;
      const hasChanges = lastSavedDataRef.current !== currentSignature;
      
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges);
      }
    }, 500);

    return () => clearTimeout(changeTimeout);
  }, [currentSignature, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      itemsCount: savedItems.length, 
      title: savedTitle, 
      columnsCount: savedColumns?.length || 0, 
      timezone: savedTimezone, 
      startTime: savedStartTime 
    });
    lastSavedDataRef.current = signature;
    lastSignatureRef.current = signature;
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && isInitialized && !initializationInProgressRef.current) {
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    if (loading) {
      // Clear any pending initialization when loading starts
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      initializationInProgressRef.current = false;
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
