
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
  const lastProcessingFlagClearTime = useRef<number>(0);
  const userActivelyTypingRef = useRef(false);
  const lastUserInteractionRef = useRef<number>(0);

  // Enhanced signature creation that excludes showcaller-only changes
  const createContentSignature = useCallback(() => {
    // Only include actual content, not showcaller state
    return JSON.stringify({
      items: (items || []).map(item => ({
        ...item,
        // Remove showcaller-specific fields from signature
        status: undefined,
        currentSegmentId: undefined
      })),
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Track user typing activity
  const setUserTyping = useCallback((typing: boolean) => {
    userActivelyTypingRef.current = typing;
    if (typing) {
      lastUserInteractionRef.current = Date.now();
    }
  }, []);

  // Initialize tracking after a longer delay to avoid initial change detection
  useEffect(() => {
    if (!isInitialized) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Longer timeout to ensure data has fully settled
      initializationTimeoutRef.current = setTimeout(() => {
        const currentSignature = createContentSignature();
        lastSavedDataRef.current = currentSignature;
        setIsInitialized(true);
        console.log('🔄 Change tracking initialized with signature length:', currentSignature.length);
      }, 1000); // Increased from 500ms
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createContentSignature]);

  // Enhanced change detection with better protection
  useEffect(() => {
    // CRITICAL: Multiple layers of protection against false positives
    if (!isInitialized || 
        isLoading || 
        isProcessingRealtimeUpdate || 
        isApplyingRemoteUpdateRef.current ||
        isInRealtimeCooldown.current) {
      return;
    }

    // Don't trigger changes immediately after clearing processing flags
    const timeSinceLastClear = Date.now() - lastProcessingFlagClearTime.current;
    if (timeSinceLastClear < 2000) { // Increased from 1000ms
      return;
    }

    // Don't trigger changes if user is actively typing
    if (userActivelyTypingRef.current) {
      console.log('🚫 Skipping change detection - user actively typing');
      return;
    }

    // Additional protection: don't process changes too soon after user interaction
    const timeSinceLastInteraction = Date.now() - lastUserInteractionRef.current;
    if (timeSinceLastInteraction < 1500) {
      console.log('🚫 Skipping change detection - recent user interaction');
      return;
    }

    const currentSignature = createContentSignature();
    
    // Only trigger if signature actually changed
    if (lastSavedDataRef.current !== currentSignature) {
      console.log('📝 Content change detected, marking as changed');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, createContentSignature, isProcessingRealtimeUpdate]);

  const markAsSaved = useCallback((
    savedItems: RundownItem[], 
    savedTitle: string, 
    savedColumns?: Column[], 
    savedTimezone?: string, 
    savedStartTime?: string
  ) => {
    const savedSignature = JSON.stringify({
      items: (savedItems || []).map(item => ({
        ...item,
        status: undefined,
        currentSegmentId: undefined
      })),
      title: savedTitle || '',
      columns: savedColumns || [],
      timezone: savedTimezone || '',
      startTime: savedStartTime || ''
    });
    
    lastSavedDataRef.current = savedSignature;
    setHasUnsavedChanges(false);
    console.log('✅ Marked as saved, signature length:', savedSignature.length);
  }, []);

  const markAsChanged = useCallback(() => {
    if (isInitialized && 
        !isLoading && 
        !isProcessingRealtimeUpdate && 
        !isApplyingRemoteUpdateRef.current &&
        !isInRealtimeCooldown.current &&
        !userActivelyTypingRef.current) {
      console.log('📝 Manually marking as changed');
      setHasUnsavedChanges(true);
    }
  }, [isInitialized, isLoading, isProcessingRealtimeUpdate]);

  // Enhanced signature update with better synchronization
  const updateSavedSignature = useCallback((
    newItems: RundownItem[], 
    newTitle: string, 
    newColumns?: Column[], 
    newTimezone?: string, 
    newStartTime?: string
  ) => {
    // Start realtime cooldown period
    isInRealtimeCooldown.current = true;
    if (realtimeCooldownRef.current) {
      clearTimeout(realtimeCooldownRef.current);
    }

    const newSignature = JSON.stringify({
      items: (newItems || []).map(item => ({
        ...item,
        status: undefined,
        currentSegmentId: undefined
      })),
      title: newTitle || '',
      columns: newColumns || [],
      timezone: newTimezone || '',
      startTime: newStartTime || ''
    });
    
    lastSavedDataRef.current = newSignature;
    setHasUnsavedChanges(false);
    console.log('🔄 Updated saved signature from realtime, length:', newSignature.length);

    // Extended cooldown period to prevent immediate change detection
    realtimeCooldownRef.current = setTimeout(() => {
      isInRealtimeCooldown.current = false;
      console.log('❄️ Realtime cooldown ended');
    }, 3000); // Increased from 1.5 seconds
  }, []);

  // Enhanced method to set the applying remote update flag
  const setApplyingRemoteUpdate = useCallback((applying: boolean) => {
    isApplyingRemoteUpdateRef.current = applying;

    if (!applying) {
      // When finishing remote update, ensure extended cooldown
      lastProcessingFlagClearTime.current = Date.now();
      isInRealtimeCooldown.current = true;
      if (realtimeCooldownRef.current) {
        clearTimeout(realtimeCooldownRef.current);
      }
      realtimeCooldownRef.current = setTimeout(() => {
        isInRealtimeCooldown.current = false;
        console.log('❄️ Extended realtime cooldown ended after remote update');
      }, 4000); // Extended cooldown after remote updates
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
    setApplyingRemoteUpdate,
    setUserTyping // Export this for components to use
  };
};
