
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
  const isApplyingRemoteUpdateRef = useRef(false);
  const realtimeCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const isInRealtimeCooldown = useRef(false);

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
        console.log('Change tracking initialized with signature:', currentSignature.substring(0, 100) + '...');
      }, 500);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createDataSignature]);

  // Track changes after initialization - ENHANCED protection against realtime updates
  useEffect(() => {
    // CRITICAL: Multiple layers of protection against realtime update interference
    if (!isInitialized || 
        isLoading || 
        isProcessingRealtimeUpdate || 
        isApplyingRemoteUpdateRef.current ||
        isInRealtimeCooldown.current) {
      
      if (isProcessingRealtimeUpdate || isApplyingRemoteUpdateRef.current) {
        console.log('🚫 Skipping change tracking - realtime update in progress');
      }
      if (isInRealtimeCooldown.current) {
        console.log('🚫 Skipping change tracking - in realtime cooldown period');
      }
      return;
    }

    const currentSignature = createDataSignature();
    
    if (lastSavedDataRef.current !== currentSignature) {
      console.log('📝 Data changed - marking as unsaved');
      console.log('Previous signature:', lastSavedDataRef.current.substring(0, 100) + '...');
      console.log('Current signature:', currentSignature.substring(0, 100) + '...');
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
    console.log('✅ Marked as saved with signature:', savedSignature.substring(0, 100) + '...');
  }, []);

  const markAsChanged = useCallback(() => {
    if (isInitialized && 
        !isLoading && 
        !isProcessingRealtimeUpdate && 
        !isApplyingRemoteUpdateRef.current &&
        !isInRealtimeCooldown.current) {
      console.log('📝 Manually marked as changed');
      setHasUnsavedChanges(true);
    } else if (isProcessingRealtimeUpdate || isApplyingRemoteUpdateRef.current || isInRealtimeCooldown.current) {
      console.log('🚫 Skipping manual mark as changed - realtime processing or cooldown active');
    }
  }, [isInitialized, isLoading, isProcessingRealtimeUpdate]);

  // ENHANCED signature update with perfect synchronization
  const updateSavedSignature = useCallback((
    newItems: RundownItem[], 
    newTitle: string, 
    newColumns?: Column[], 
    newTimezone?: string, 
    newStartTime?: string
  ) => {
    // Start realtime cooldown period to prevent any changes from being detected
    isInRealtimeCooldown.current = true;
    if (realtimeCooldownRef.current) {
      clearTimeout(realtimeCooldownRef.current);
    }

    const newSignature = JSON.stringify({
      items: newItems || [],
      title: newTitle || '',
      columns: newColumns || [],
      timezone: newTimezone || '',
      startTime: newStartTime || ''
    });
    
    lastSavedDataRef.current = newSignature;
    setHasUnsavedChanges(false);
    console.log('🔄 Updated saved signature after remote update:', newSignature.substring(0, 100) + '...');

    // Set cooldown period to prevent immediate change detection
    realtimeCooldownRef.current = setTimeout(() => {
      isInRealtimeCooldown.current = false;
      console.log('✅ Realtime cooldown period ended');
    }, 1000); // 1 second cooldown
  }, []);

  // Method to set the applying remote update flag
  const setApplyingRemoteUpdate = useCallback((applying: boolean) => {
    isApplyingRemoteUpdateRef.current = applying;
    console.log(applying ? '🔄 Starting remote update application' : '✅ Finished remote update application');

    if (!applying) {
      // When finishing remote update, ensure cooldown is active
      isInRealtimeCooldown.current = true;
      if (realtimeCooldownRef.current) {
        clearTimeout(realtimeCooldownRef.current);
      }
      realtimeCooldownRef.current = setTimeout(() => {
        isInRealtimeCooldown.current = false;
        console.log('✅ Post-remote-update cooldown period ended');
      }, 1500); // Extended cooldown after remote updates
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeCooldownRef.current) {
        clearTimeout(realtimeCooldownRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading,
    updateSavedSignature,
    setApplyingRemoteUpdate
  };
};
