
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const initializationKey = useRef<string>('');

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

  // Initialize tracking once when we have meaningful data
  useEffect(() => {
    // Create a key to prevent duplicate initialization
    const currentKey = `${items.length}-${rundownTitle}-${JSON.stringify(columns)}`;
    
    // Only initialize once per unique data set
    if (initializedRef.current && initializationKey.current === currentKey) {
      return;
    }
    
    if (isLoadingRef.current) return;
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    if (!hasMeaningfulData) return;

    console.log('Change tracking initialized with signature length:', createSignature(items, rundownTitle, columns, timezone, startTime).length);

    const signature = createSignature(items, rundownTitle, columns, timezone, startTime);
    
    lastSavedDataRef.current = signature;
    initializedRef.current = true;
    initializationKey.current = currentKey;
    setIsInitialized(true);
    setHasUnsavedChanges(false);
  }, [items.length, rundownTitle, JSON.stringify(columns)]);

  // Track changes after initialization - with debouncing
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
