
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const itemsLengthRef = useRef(items.length);
  const titleRef = useRef(rundownTitle);

  console.log(`📊 useChangeTracking instance #${instanceIdRef.current} created`);

  // Stable signature creation function
  const createSignature = useCallback((dataItems: RundownItem[], title: string, cols?: Column[], tz?: string, st?: string) => {
    return JSON.stringify({ 
      items: dataItems.map(item => ({ id: item.id, ...item })), 
      title, 
      columns: cols, 
      timezone: tz, 
      startTime: st 
    });
  }, []);

  // Memoize current signature but only recalculate when actual content changes
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
      
      // Store initial values to prevent false change detection
      itemsLengthRef.current = items.length;
      titleRef.current = rundownTitle;
    } else {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} init effect: Has meaningful data: false`);
    }
  }, [items.length, rundownTitle, currentSignature]);

  // Track changes after initialization - use refs to prevent excessive calls
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

    // Only check for changes if something actually changed
    const itemsChanged = itemsLengthRef.current !== items.length;
    const titleChanged = titleRef.current !== rundownTitle;
    
    if (!itemsChanged && !titleChanged) {
      // No major changes detected, skip expensive signature comparison
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Has changes: ${hasChanges} Current hasUnsavedChanges: ${hasUnsavedChanges}`);
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log(`📊 Change tracking instance #${instanceIdRef.current} change effect: Updating hasUnsavedChanges to: ${hasChanges}`);
      setHasUnsavedChanges(hasChanges);
      
      // Update refs to current values
      itemsLengthRef.current = items.length;
      titleRef.current = rundownTitle;
    }
  }, [currentSignature, hasUnsavedChanges, items.length, rundownTitle]);

  // Stable callback functions
  const markAsSaved = useCallback((savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = createSignature(savedItems, savedTitle, savedColumns, savedTimezone, savedStartTime);
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    
    // Update refs
    itemsLengthRef.current = savedItems.length;
    titleRef.current = savedTitle;
  }, [createSignature]);

  const markAsChanged = useCallback(() => {
    if (!isLoadingRef.current && initializedRef.current) {
      setHasUnsavedChanges(true);
    }
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
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
