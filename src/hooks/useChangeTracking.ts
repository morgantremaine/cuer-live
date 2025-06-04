
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const hasInitialDataRef = useRef(false);

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
    // Skip if already initialized or currently loading
    if (initializedRef.current || isLoadingRef.current) return;
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    // Only initialize once we have meaningful data and haven't initialized before
    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      const signature = createSignature(items, rundownTitle, columns, timezone, startTime);
      
      console.log('Change tracking initialized with signature length:', signature.length);
      
      lastSavedDataRef.current = signature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items.length > 0, rundownTitle !== 'Live Broadcast Rundown']);

  // Track changes after initialization - this should run on every change
  useEffect(() => {
    if (!initializedRef.current || isLoadingRef.current) return;

    const currentSignature = createSignature(items, rundownTitle, columns, timezone, startTime);
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', hasChanges ? 'unsaved changes' : 'no changes');
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = createSignature(savedItems, savedTitle, savedColumns, savedTimezone, savedStartTime);
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved with signature length:', signature.length);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && initializedRef.current) {
      console.log('Manually marking as changed');
      setHasUnsavedChanges(true);
    }
  };

  const setIsLoading = (loading: boolean) => {
    isLoadingRef.current = loading;
    if (loading) {
      console.log('Setting loading state, preventing change detection');
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
