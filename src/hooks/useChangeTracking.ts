
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (
  items: RundownItem[], 
  rundownTitle: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const lastSavedDataRef = useRef<string>('');
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a stable signature for the current data
  const createDataSignature = useCallback(() => {
    return JSON.stringify({
      items: items || [],
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Initialize tracking after a short delay to avoid initial change detection
  useEffect(() => {
    if (!isInitialized) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Set a timeout to initialize after data has settled
      initializationTimeoutRef.current = setTimeout(() => {
        const currentSignature = createDataSignature();
        lastSavedDataRef.current = currentSignature;
        setIsInitialized(true);
        console.log('Change tracking initialized');
      }, 500);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createDataSignature]);

  // Track changes after initialization - but SKIP during realtime updates
  useEffect(() => {
    if (!isInitialized || isLoading || isProcessingRealtimeUpdate) {
      if (isProcessingRealtimeUpdate) {
        console.log('🚫 Skipping change tracking - realtime update in progress');
      }
      return;
    }

    const currentSignature = createDataSignature();
    
    if (lastSavedDataRef.current !== currentSignature) {
      console.log('📝 Data changed - marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, createDataSignature, isProcessingRealtimeUpdate]);

  const markAsSaved = useCallback((
    savedItems: RundownItem[], 
    savedTitle: string, 
    savedColumns?: Column[], 
    savedTimezone?: string, 
    savedStartTime?: string
  ) => {
    const savedSignature = JSON.stringify({
      items: savedItems || [],
      title: savedTitle || '',
      columns: savedColumns || [],
      timezone: savedTimezone || '',
      startTime: savedStartTime || ''
    });
    
    lastSavedDataRef.current = savedSignature;
    setHasUnsavedChanges(false);
    console.log('✅ Marked as saved');
  }, []);

  const markAsChanged = useCallback(() => {
    if (isInitialized && !isLoading && !isProcessingRealtimeUpdate) {
      console.log('📝 Manually marked as changed');
      setHasUnsavedChanges(true);
    } else if (isProcessingRealtimeUpdate) {
      console.log('🚫 Skipping manual mark as changed - realtime update in progress');
    }
  }, [isInitialized, isLoading, isProcessingRealtimeUpdate]);

  // Special method to update the saved data signature without triggering change detection
  // This is used when applying remote updates
  const updateSavedSignature = useCallback((
    newItems: RundownItem[], 
    newTitle: string, 
    newColumns?: Column[], 
    newTimezone?: string, 
    newStartTime?: string
  ) => {
    const newSignature = JSON.stringify({
      items: newItems || [],
      title: newTitle || '',
      columns: newColumns || [],
      timezone: newTimezone || '',
      startTime: newStartTime || ''
    });
    
    lastSavedDataRef.current = newSignature;
    console.log('🔄 Updated saved signature after remote update');
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading,
    updateSavedSignature
  };
};
