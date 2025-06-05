
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
  
  // Initialize instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++instanceCounter;
  }

  // Create signature only when values actually change
  const currentSignature = useMemo(() => {
    return JSON.stringify({ 
      items: items.map(item => ({ id: item.id, ...item })), 
      title: rundownTitle, 
      columns, 
      timezone, 
      startTime 
    });
  }, [items, rundownTitle, JSON.stringify(columns), timezone, startTime]);

  // Initialize tracking ONLY ONCE when we first get meaningful data
  useEffect(() => {
    // Skip if already initialized or currently loading
    if (initializedRef.current || isLoadingRef.current) {
      return;
    }
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';

    // Only initialize once we have meaningful data and haven't initialized before
    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      
      lastSavedDataRef.current = currentSignature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items.length, rundownTitle]); // Minimal dependencies to prevent loops

  // Track changes after initialization - only check when signature changes
  useEffect(() => {
    if (!initializedRef.current || isLoadingRef.current) {
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentSignature, hasUnsavedChanges]); // Only depend on actual changes

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
    setHasUnsavedChanges(false);
  }, []);

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
