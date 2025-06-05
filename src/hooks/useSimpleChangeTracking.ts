
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useSimpleChangeTracking = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedStateRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeCheckRef = useRef<string>('');
  const stableReferenceRef = useRef<boolean>(false);

  const createStateSignature = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    return JSON.stringify({ 
      items: items.map(item => ({ 
        id: item.id,
        name: item.name,
        startTime: item.startTime,
        duration: item.duration,
        type: item.type,
        rowNumber: item.rowNumber
      })), 
      title, 
      columns: columns?.map(col => ({ id: col.id, name: col.name, visible: col.visible })), 
      timezone, 
      startTime 
    });
  }, []);

  const initialize = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    console.log('Simple change tracking: Initialize called with:', {
      itemsLength: items.length,
      title,
      isInitialized,
      isLoading: isLoadingRef.current
    });

    if (isInitialized) {
      console.log('Simple change tracking: Already initialized, skipping');
      return;
    }

    if (isLoadingRef.current) {
      console.log('Simple change tracking: Still loading, delaying initialization');
      return;
    }

    if (items.length === 0) {
      console.log('Simple change tracking: No items, will initialize when items are loaded');
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }
    
    // Immediate initialization if we have stable data
    const signature = createStateSignature(items, title, columns, timezone, startTime);
    lastSavedStateRef.current = signature;
    lastChangeCheckRef.current = signature;
    setIsInitialized(true);
    setHasUnsavedChanges(false);
    stableReferenceRef.current = true;
    console.log('Simple change tracking: Successfully initialized with signature length:', signature.length, 'items:', items.length);
  }, [isInitialized, createStateSignature]);

  const checkForChanges = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    if (!isInitialized || isLoadingRef.current || items.length === 0 || !stableReferenceRef.current) {
      return;
    }

    const currentSignature = createStateSignature(items, title, columns, timezone, startTime);
    
    // Only check for changes if the signature actually changed from the last check
    if (currentSignature === lastChangeCheckRef.current) {
      return;
    }
    
    lastChangeCheckRef.current = currentSignature;
    const hasChanges = currentSignature !== lastSavedStateRef.current;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
      console.log('Simple change tracking: Changes detected:', hasChanges, 'signature diff:', hasChanges ? 'YES' : 'NO');
    }
  }, [isInitialized, hasUnsavedChanges, createStateSignature]);

  const markAsSaved = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    const signature = createStateSignature(items, title, columns, timezone, startTime);
    lastSavedStateRef.current = signature;
    lastChangeCheckRef.current = signature;
    setHasUnsavedChanges(false);
    console.log('Simple change tracking: Marked as saved, signature length:', signature.length);
  }, [createStateSignature]);

  const markAsChanged = useCallback(() => {
    if (isInitialized && !isLoadingRef.current && stableReferenceRef.current) {
      setHasUnsavedChanges(true);
      console.log('Simple change tracking: Marked as changed');
    } else {
      console.log('Simple change tracking: Cannot mark as changed:', {
        isInitialized,
        isLoading: isLoadingRef.current,
        stable: stableReferenceRef.current
      });
    }
  }, [isInitialized]);

  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
    console.log('Simple change tracking: Set loading to:', loading);
    
    if (!loading) {
      // Small delay to ensure data is stable before allowing change tracking
      setTimeout(() => {
        stableReferenceRef.current = true;
        console.log('Simple change tracking: Data stabilized, ready for change tracking');
      }, 100);
    } else {
      stableReferenceRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setIsInitialized(false);
    setHasUnsavedChanges(false);
    lastSavedStateRef.current = '';
    lastChangeCheckRef.current = '';
    stableReferenceRef.current = false;
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }
    console.log('Simple change tracking: Reset state');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isInitialized,
    initialize,
    checkForChanges,
    markAsSaved,
    markAsChanged,
    setIsLoading,
    reset
  };
};
