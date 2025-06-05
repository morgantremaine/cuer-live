
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

let instanceCounter = 0;

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs to prevent recreation
  const lastSavedDataRef = useRef<string>('');
  const initializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasInitialDataRef = useRef(false);
  const instanceIdRef = useRef<number>();
  const lastChangeCheckRef = useRef<number>(0);
  const preventResetRef = useRef(false);
  const lastItemCountRef = useRef<number>(0);
  
  // Initialize instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++instanceCounter;
  }

  // Create signature only when values actually change - increased debouncing
  const currentSignature = useMemo(() => {
    const now = Date.now();
    // Increased debounce to reduce excessive computation
    if (now - lastChangeCheckRef.current < 1000) {
      return lastSavedDataRef.current;
    }
    lastChangeCheckRef.current = now;
    
    const signature = JSON.stringify({ 
      items: items.map(item => ({ id: item.id, ...item })), 
      title: rundownTitle, 
      columns, 
      timezone, 
      startTime 
    });
    
    console.log('Change tracking: Creating signature with', items.length, 'items');
    return signature;
  }, [items, rundownTitle, JSON.stringify(columns), timezone, startTime]);

  // Initialize tracking ONLY ONCE when we first get meaningful data
  useEffect(() => {
    if (initializedRef.current || isLoadingRef.current || preventResetRef.current) {
      return;
    }
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';

    console.log('Change tracking: Checking initialization with', items.length, 'items, title:', rundownTitle);

    // Prevent reinitialization if we already have data and items count is increasing
    // This indicates data is being loaded, not reset
    if (hasInitialDataRef.current && items.length > lastItemCountRef.current && items.length > 4) {
      console.log('Change tracking: Preventing reset - data is being loaded, items increased from', lastItemCountRef.current, 'to', items.length);
      preventResetRef.current = true;
      // Update the baseline without triggering reinitialization
      lastSavedDataRef.current = currentSignature;
      return;
    }

    // If we already have meaningful data loaded, don't reset unless it's clearly a new session
    if (hasInitialDataRef.current && items.length >= 4 && rundownTitle !== 'Live Broadcast Rundown') {
      console.log('Change tracking: Preventing reset - already have loaded data');
      preventResetRef.current = true;
      return;
    }

    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      lastItemCountRef.current = items.length;
      
      lastSavedDataRef.current = currentSignature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      
      console.log('Change tracking: Initialized with', items.length, 'items');
    }
  }, [items.length, rundownTitle, currentSignature]);

  // Track changes after initialization - reduced frequency
  useEffect(() => {
    if (!initializedRef.current || isLoadingRef.current) {
      return;
    }

    // Update last item count
    lastItemCountRef.current = items.length;

    // Only check for changes if signature actually changed and enough time has passed
    if (lastSavedDataRef.current !== currentSignature) {
      const hasChanges = true;
      console.log('Change tracking: Detected changes, items count:', items.length);
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges);
      }
    }
  }, [currentSignature, hasUnsavedChanges, items.length]);

  // Stable callback functions
  const markAsSaved = useCallback((savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      items: savedItems.map(item => ({ id: item.id, ...item })), 
      title: savedTitle, 
      columns: savedColumns, 
      timezone: savedTimezone, 
      startTime: savedStartTime 
    });
    lastSavedDataRef.current = signature;
    lastItemCountRef.current = savedItems.length;
    setHasUnsavedChanges(false);
    console.log('Change tracking: Marked as saved with', savedItems.length, 'items');
  }, []);

  const markAsChanged = useCallback(() => {
    if (!isLoadingRef.current && initializedRef.current) {
      console.log('Change tracking: Manually marked as changed');
      setHasUnsavedChanges(true);
    }
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    console.log('Change tracking: Setting loading state to', loading);
    isLoadingRef.current = loading;
    if (loading) {
      preventResetRef.current = true;
    }
  }, []);

  // Reset unsaved changes flag when blueprint saves complete
  const markBlueprintAsSaved = useCallback(() => {
    console.log('Change tracking: Blueprint marked as saved');
    // Don't change the signature, just clear the unsaved flag for blueprint components
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    markBlueprintAsSaved,
    isInitialized,
    setIsLoading
  };
};
