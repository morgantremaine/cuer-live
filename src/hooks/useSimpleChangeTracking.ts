
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useSimpleChangeTracking = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastSavedStateRef = useRef<string>('');
  const lastChangeCheckRef = useRef<string>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      columns: columns?.map(col => ({ id: col.id, name: col.name, isVisible: col.isVisible })), 
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
    console.log('Simple change tracking: Initialize called');

    if (isInitialized) {
      console.log('Simple change tracking: Already initialized, skipping');
      return;
    }

    if (items.length === 0) {
      console.log('Simple change tracking: No items, will initialize when items are loaded');
      return;
    }

    const signature = createStateSignature(items, title, columns, timezone, startTime);
    lastSavedStateRef.current = signature;
    lastChangeCheckRef.current = signature;
    setIsInitialized(true);
    setHasUnsavedChanges(false);
    console.log('Simple change tracking: Successfully initialized');
  }, [isInitialized, createStateSignature]);

  const checkForChanges = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    if (!isInitialized || items.length === 0) {
      return;
    }

    // Debounce the change check to prevent excessive calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const currentSignature = createStateSignature(items, title, columns, timezone, startTime);
      
      // Only check for changes if the signature actually changed from the last check
      if (currentSignature === lastChangeCheckRef.current) {
        return;
      }
      
      lastChangeCheckRef.current = currentSignature;
      const hasChanges = currentSignature !== lastSavedStateRef.current;
      
      if (hasChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasChanges);
        console.log('Simple change tracking: Changes detected:', hasChanges);
      }
    }, 100);
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
    console.log('Simple change tracking: Marked as saved');
  }, [createStateSignature]);

  const markAsChanged = useCallback(() => {
    if (isInitialized) {
      setHasUnsavedChanges(true);
      console.log('Simple change tracking: Marked as changed');
    }
  }, [isInitialized]);

  const reset = useCallback(() => {
    setIsInitialized(false);
    setHasUnsavedChanges(false);
    setIsLoading(false);
    lastSavedStateRef.current = '';
    lastChangeCheckRef.current = '';
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    console.log('Simple change tracking: Reset state');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isInitialized,
    isLoading,
    setIsLoading,
    initialize,
    checkForChanges,
    markAsSaved,
    markAsChanged,
    reset
  };
};
