
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useSimpleChangeTracking = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedStateRef = useRef<string>('');
  const isLoadingRef = useRef(false);

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
      const signature = createStateSignature(items, title, columns, timezone, startTime);
      lastSavedStateRef.current = signature;
      setIsInitialized(true);
      setHasUnsavedChanges(false);
      console.log('Simple change tracking: Initialized');
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
    console.log('Simple change tracking: Marked as saved');
  }, [createStateSignature]);

  const markAsChanged = useCallback(() => {
    if (isInitialized && !isLoadingRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [isInitialized]);

  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
    if (!loading && !isInitialized) {
      // Auto-initialize when loading completes
      setIsInitialized(true);
    }
  }, [isInitialized]);

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
