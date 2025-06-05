
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
    if (!isInitialized && !isLoadingRef.current) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      // Add a longer delay to ensure all data is fully loaded and stabilized
      initializationTimeoutRef.current = setTimeout(() => {
        const signature = createStateSignature(items, title, columns, timezone, startTime);
        lastSavedStateRef.current = signature;
        setIsInitialized(true);
        setHasUnsavedChanges(false);
        console.log('Simple change tracking: Initialized with delay, signature length:', signature.length);
      }, 500);
    }
  }, [isInitialized, createStateSignature]);

  const checkForChanges = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    if (!isInitialized || isLoadingRef.current) return;

    const currentSignature = createStateSignature(items, title, columns, timezone, startTime);
    const hasChanges = currentSignature !== lastSavedStateRef.current;
    
    if (hasChanges !== hasUnsavedChanges) {
      setHasUnsavedChanges(hasChanges);
      console.log('Simple change tracking: Changes detected:', hasChanges, 'current vs saved length:', currentSignature.length, lastSavedStateRef.current.length);
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
    }
  }, [isInitialized]);

  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
    console.log('Simple change tracking: Set loading to:', loading);
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
    setIsLoading
  };
};
