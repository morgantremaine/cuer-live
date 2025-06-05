
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useSimpleChangeTracking = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedStateRef = useRef<string>('');
  const isLoadingRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createStateSignature = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    return JSON.stringify({ 
      items: items.map(item => ({ id: item.id, ...item })), 
      title, 
      columns, 
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
      console.log('Simple change tracking: Still loading, skipping initialization');
      return;
    }

    if (items.length === 0) {
      console.log('Simple change tracking: No items, skipping initialization');
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }
    
    // Use a shorter delay and initialize immediately if we have data
    initializationTimeoutRef.current = setTimeout(() => {
      const signature = createStateSignature(items, title, columns, timezone, startTime);
      lastSavedStateRef.current = signature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      console.log('Simple change tracking: Successfully initialized with signature length:', signature.length, 'items:', items.length);
    }, 500); // Reduced delay to 500ms
  }, [isInitialized, createStateSignature]);

  const checkForChanges = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    if (!isInitialized || isLoadingRef.current || items.length === 0) {
      console.log('Simple change tracking: Skipping change check:', {
        isInitialized,
        isLoading: isLoadingRef.current,
        itemsLength: items.length
      });
      return;
    }

    const currentSignature = createStateSignature(items, title, columns, timezone, startTime);
    const hasChanges = currentSignature !== lastSavedStateRef.current;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
      console.log('Simple change tracking: Changes detected:', hasChanges);
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
    setHasUnsavedChanges(false);
    console.log('Simple change tracking: Marked as saved, signature length:', signature.length);
  }, [createStateSignature]);

  const markAsChanged = useCallback(() => {
    if (isInitialized && !isLoadingRef.current) {
      setHasUnsavedChanges(true);
      console.log('Simple change tracking: Marked as changed');
    } else {
      console.log('Simple change tracking: Cannot mark as changed:', {
        isInitialized,
        isLoading: isLoadingRef.current
      });
    }
  }, [isInitialized]);

  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
    console.log('Simple change tracking: Set loading to:', loading);
    
    // If we're done loading and have data, try to initialize immediately
    if (!loading && !isInitialized) {
      console.log('Simple change tracking: Loading finished, will attempt delayed initialization');
    }
  }, [isInitialized]);

  // Reset state when no longer on a rundown page
  const reset = useCallback(() => {
    setIsInitialized(false);
    setHasUnsavedChanges(false);
    lastSavedStateRef.current = '';
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
