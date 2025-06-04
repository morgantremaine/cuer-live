
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedDataRef = useRef<string>('');
  const initialLoadRef = useRef(false);
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  // Initialize tracking after first meaningful load - prevent duplicate initialization
  useEffect(() => {
    // Clear any pending initialization
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Only initialize once we have meaningful data and haven't initialized yet
    if (!initialLoadRef.current && !isInitializingRef.current && (items.length > 0 || rundownTitle !== 'Live Broadcast Rundown')) {
      isInitializingRef.current = true;
      
      initializationTimeoutRef.current = setTimeout(() => {
        if (!initialLoadRef.current) {
          const signature = JSON.stringify({ 
            items: items.map(item => ({ id: item.id, ...item })), 
            title: rundownTitle, 
            columns, 
            timezone, 
            startTime 
          });
          lastSavedDataRef.current = signature;
          initialLoadRef.current = true;
          setIsInitialized(true);
          setHasUnsavedChanges(false);
          isInitializingRef.current = false;
          console.log('Change tracking initialized with signature length:', signature.length);
        }
      }, 200);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [items.length, rundownTitle]);

  // Track changes after initialization
  useEffect(() => {
    if (!isInitialized || isLoadingRef.current || isInitializingRef.current) return;

    const currentSignature = JSON.stringify({ 
      items: items.map(item => ({ id: item.id, ...item })), 
      title: rundownTitle, 
      columns, 
      timezone, 
      startTime 
    });
    
    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('Change detected:', hasChanges ? 'unsaved changes' : 'no changes');
      setHasUnsavedChanges(hasChanges);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, hasUnsavedChanges]);

  const markAsSaved = (savedItems: RundownItem[], savedTitle: string, savedColumns?: Column[], savedTimezone?: string, savedStartTime?: string) => {
    const signature = JSON.stringify({ 
      items: savedItems.map(item => ({ id: item.id, ...item })), 
      title: savedTitle, 
      columns: savedColumns, 
      timezone: savedTimezone, 
      startTime: savedStartTime 
    });
    lastSavedDataRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Marked as saved with signature length:', signature.length);
  };

  const markAsChanged = () => {
    if (!isLoadingRef.current && isInitialized && !isInitializingRef.current) {
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
