
import { useState, useEffect, useRef, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

let instanceCounter = 0;

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasInitialDataRef = useRef(false);
  const instanceIdRef = useRef(++instanceCounter);

  console.log(`📊 useChangeTracking instance #${instanceIdRef.current} created`);

  // Memoize the signature creation to prevent unnecessary recalculations
  const createSignature = useMemo(() => {
    return (dataItems: RundownItem[], title: string, cols?: Column[], tz?: string, st?: string) => {
      return JSON.stringify({ 
        items: dataItems.map(item => ({ id: item.id, ...item })), 
        title, 
        columns: cols, 
        timezone: tz, 
        startTime: st 
      });
    };
  }, []);

  // Stable current signature
  const currentSignature = useMemo(() => {
    return createSignature(items, rundownTitle, columns, timezone, startTime);
  }, [items, rundownTitle, columns, timezone, startTime, createSignature]);

  // Initialize tracking ONLY ONCE when we first get meaningful data
  useEffect(() => {
    // Skip if already initialized or currently loading
    if (initializedRef.current || isLoadingRef.current) {
      return;
    }
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect:`, {
      alreadyInitialized: initializedRef.current,
      isLoading: isLoadingRef.current,
      itemsLength: items.length,
      title: rundownTitle,
      hasInitialData: hasInitialDataRef.current
    });

    // Only initialize once we have meaningful data and haven't initialized before
    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Has meaningful data: true`);
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Initializing with signature length: ${currentSignature.length}`);
      
      lastSavedDataRef.current = currentSignature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    } else {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Has meaningful data: false`);
    }
  }, [items.length, rundownTitle, currentSignature]);

  // Track changes after initialization - this should run on every change
  useEffect(() => {
    console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect:`, {
      isInitialized: initializedRef.current,
      isLoading: isLoadingRef.current,
      itemsLength: items.length,
      title: rundownTitle
    });

    if (!initializedRef.current || isLoadingRef.current) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Skipping - not initialized or loading`);
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Has changes: ${hasChanges} Current hasUnsavedChanges: ${hasUnsavedChanges}`);
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Updating hasUnsavedChanges to: ${hasChanges}`);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentSignature, hasUnsavedChanges, items.length, rundownTitle]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = createSignature(savedItems, savedTitle, savedColumns, savedTimezone, savedStartTime);
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && initializedRef.current) {
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
