
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

// Add a global counter to track hook instances
let changeTrackingInstanceCounter = 0;

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasInitialDataRef = useRef(false);
  const instanceIdRef = useRef<number>();

  // Assign instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++changeTrackingInstanceCounter;
    console.log(`📊 useChangeTracking instance #${instanceIdRef.current} created`);
  }

  // Create a stable signature for the data
  const createSignature = (dataItems: RundownItem[], title: string, cols?: Column[], tz?: string, st?: string) => {
    return JSON.stringify({ 
      items: dataItems.map(item => ({ id: item.id, ...item })), 
      title, 
      columns: cols, 
      timezone: tz, 
      startTime: st 
    });
  };

  // Initialize tracking ONLY ONCE when we first get meaningful data
  useEffect(() => {
    console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect:`, {
      alreadyInitialized: initializedRef.current,
      isLoading: isLoadingRef.current,
      itemsLength: items.length,
      title: rundownTitle,
      hasInitialData: hasInitialDataRef.current
    });

    // Skip if already initialized or currently loading
    if (initializedRef.current || isLoadingRef.current) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Skipping - already initialized or loading`);
      return;
    }
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Has meaningful data:`, hasMeaningfulData);
    
    // Only initialize once we have meaningful data and haven't initialized before
    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      const signature = createSignature(items, rundownTitle, columns, timezone, startTime);
      
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Initializing with signature length:`, signature.length);
      
      lastSavedDataRef.current = signature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items.length, rundownTitle]);

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

    const currentSignature = createSignature(items, rundownTitle, columns, timezone, startTime);
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Has changes:`, hasChanges, 'Current hasUnsavedChanges:', hasUnsavedChanges);
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Updating hasUnsavedChanges to:`, hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = createSignature(savedItems, savedTitle, savedColumns, savedTimezone, savedStartTime);
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log(`📊 Change tracking instance #${instanceIdRef.current}: Marked as saved with signature length:`, signature.length);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && initializedRef.current) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current}: Manually marking as changed`);
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    if (loading) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current}: Setting loading state, preventing change detection`);
    }
  };

  // Cleanup logging
  useEffect(() => {
    return () => {
      console.log(`📊 Change tracking instance #${instanceIdRef.current}: UNMOUNTING`);
    };
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading
  };
};
