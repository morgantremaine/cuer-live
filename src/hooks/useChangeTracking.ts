
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
  const initEffectRunCountRef = useRef(0);
  const changeEffectRunCountRef = useRef(0);

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
    initEffectRunCountRef.current += 1;
    const runNumber = initEffectRunCountRef.current;
    
    console.log(`Change tracking init effect run #${runNumber}:`, {
      alreadyInitialized: initializedRef.current,
      isLoading: isLoadingRef.current,
      itemsLength: items.length,
      title: rundownTitle,
      hasInitialData: hasInitialDataRef.current
    });

    // Skip if already initialized or currently loading
    if (initializedRef.current || isLoadingRef.current) {
      console.log(`Change tracking init effect #${runNumber}: Skipping - already initialized or loading`);
      return;
    }
    
    // Check if we have meaningful data to initialize with
    const hasMeaningfulData = items.length > 0 || rundownTitle !== 'Live Broadcast Rundown';
    
    console.log(`Change tracking init effect #${runNumber}: Has meaningful data:`, hasMeaningfulData);
    
    // Only initialize once we have meaningful data and haven't initialized before
    if (hasMeaningfulData && !hasInitialDataRef.current) {
      hasInitialDataRef.current = true;
      const signature = createSignature(items, rundownTitle, columns, timezone, startTime);
      
      console.log(`Change tracking init effect #${runNumber}: Initializing with signature length:`, signature.length);
      
      lastSavedDataRef.current = signature;
      initializedRef.current = true;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [items.length, rundownTitle]);

  // Track changes after initialization - this should run on every change
  useEffect(() => {
    changeEffectRunCountRef.current += 1;
    const runNumber = changeEffectRunCountRef.current;
    
    console.log(`Change tracking change effect run #${runNumber}:`, {
      isInitialized: initializedRef.current,
      isLoading: isLoadingRef.current,
      itemsLength: items.length,
      title: rundownTitle
    });

    if (!initializedRef.current || isLoadingRef.current) {
      console.log(`Change tracking change effect #${runNumber}: Skipping - not initialized or loading`);
      return;
    }

    const currentSignature = createSignature(items, rundownTitle, columns, timezone, startTime);
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    console.log(`Change tracking change effect #${runNumber}: Has changes:`, hasChanges, 'Current hasUnsavedChanges:', hasUnsavedChanges);
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log(`Change tracking change effect #${runNumber}: Updating hasUnsavedChanges to:`, hasChanges);
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
