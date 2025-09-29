
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from '@/types/columns';
import { useUniversalTimer } from './useUniversalTimer';
import { createContentSignature } from '@/utils/contentSignature';

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
  const initializationTimeoutRef = useRef<string | null>(null);
  const isApplyingRemoteUpdateRef = useRef(false);
  const realtimeCooldownRef = useRef<string | null>(null);
  const isInRealtimeCooldown = useRef(false);
  const userActivelyTypingRef = useRef(false);
  const showcallerActiveRef = useRef(false);
  const showcallerBlockTimeoutRef = useRef<string | null>(null);
  
  const { setTimeout: setManagedTimeout, clearTimer } = useUniversalTimer('ChangeTracking');

  // Create content signature that COMPLETELY excludes showcaller fields
  const createContentSignatureCallback = useCallback(() => {
    // If showcaller is active, don't create new signatures
    if (showcallerActiveRef.current) {
      console.log('🚫 Showcaller active - using cached signature to prevent change detection');
      return lastSavedDataRef.current;
    }

    // Use content-only signature function for consistency with autosave
    const signature = createContentSignature({
      items: items || [],
      title: rundownTitle || '',
      columns: [], // Not used in content signature
      timezone: '', // Not used in content signature
      startTime: '', // Not used in content signature
      showDate: null,
      externalNotes: ''
    });
    
    console.log('🔍 CHANGE TRACKING: Created content-only signature', {
      itemCount: items?.length || 0,
      titleLength: (rundownTitle || '').length,
      signatureLength: signature.length,
      excludedFromSignature: ['columns', 'timezone', 'startTime']
    });
    return signature;
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Track user typing activity
  const setUserTyping = useCallback((typing: boolean) => {
    console.log('⌨️ User typing state changed:', typing);
    userActivelyTypingRef.current = typing;
  }, []);

  // Showcaller state management (no longer blocks change detection)
  // Showcaller now uses separate state channel and doesn't affect rundown content signatures
  const setShowcallerUpdate = useCallback((isShowcallerUpdate: boolean) => {
    console.log('📺 Showcaller update state:', isShowcallerUpdate);
    showcallerActiveRef.current = isShowcallerUpdate;
  }, []);

  // Initialize tracking
  useEffect(() => {
    if (!isInitialized) {
      if (initializationTimeoutRef.current) {
        clearTimer(initializationTimeoutRef.current);
      }

      initializationTimeoutRef.current = setManagedTimeout(() => {
        const currentSignature = createContentSignatureCallback();
        lastSavedDataRef.current = currentSignature;
        setIsInitialized(true);
        console.log('🔄 Change tracking initialized (showcaller-aware) with signature length:', currentSignature.length);
      }, 500);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimer(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createContentSignatureCallback, setManagedTimeout, clearTimer]);

  // Enhanced change detection that completely ignores showcaller operations
  useEffect(() => {
    // Essential blocking conditions including showcaller
    if (!isInitialized || 
        isLoading || 
        isProcessingRealtimeUpdate || 
        isApplyingRemoteUpdateRef.current ||
        showcallerActiveRef.current) {
      
      if (showcallerActiveRef.current) {
        console.log('🚫 Change detection blocked - showcaller operation active');
      }
      return;
    }

    // Create new signature (will return cached if showcaller active)
    const currentSignature = createContentSignatureCallback();
    
    // Only trigger if signature actually changed AND showcaller is not active
    if (lastSavedDataRef.current !== currentSignature && !showcallerActiveRef.current) {
      console.log('📝 CHANGE DETECTED: Content signature changed', {
        previousLength: lastSavedDataRef.current.length,
        currentLength: currentSignature.length,
        itemCount: items?.length || 0,
        titleChanged: rundownTitle !== 'previous_title_placeholder',
        showcallerActive: showcallerActiveRef.current,
        reason: 'Content modification detected'
      });
      setHasUnsavedChanges(true);
    } else if (lastSavedDataRef.current === currentSignature) {
      console.log('✅ NO CHANGE: Signatures match exactly', {
        signatureLength: currentSignature.length,
        itemCount: items?.length || 0,
        showcallerActive: showcallerActiveRef.current
      });
    } else {
      console.log('🚫 CHANGE BLOCKED: Showcaller active, ignoring changes', {
        signatureChanged: lastSavedDataRef.current !== currentSignature,
        showcallerActive: showcallerActiveRef.current
      });
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, createContentSignatureCallback, isProcessingRealtimeUpdate]);

  const markAsSaved = useCallback((
    savedItems: RundownItem[], 
    savedTitle: string, 
    savedColumns?: Column[], 
    savedTimezone?: string, 
    savedStartTime?: string
  ) => {
    // Create saved signature using content-only function
    const savedSignature = createContentSignature({
      items: savedItems || [],
      title: savedTitle || '',
      columns: [], // Not used in content signature
      timezone: '', // Not used in content signature
      startTime: '', // Not used in content signature
      showDate: null,
      externalNotes: ''
    });
    
    lastSavedDataRef.current = savedSignature;
    setHasUnsavedChanges(false);
    console.log('✅ MARKED AS SAVED: Updated baseline signature', {
      signatureLength: savedSignature.length,
      itemCount: (savedItems || []).length,
      title: savedTitle || '',
      excludedFromSignature: ['columns', 'timezone', 'startTime']
    });
  }, []);

  const markAsChanged = useCallback(() => {
    if (isInitialized && 
        !isLoading && 
        !isProcessingRealtimeUpdate && 
        !isApplyingRemoteUpdateRef.current &&
        !showcallerActiveRef.current) {
      console.log('📝 Manually marking as changed (not showcaller)');
      setHasUnsavedChanges(true);
    }
  }, [isInitialized, isLoading, isProcessingRealtimeUpdate]);

  // Update saved signature
  const updateSavedSignature = useCallback((
    newItems: RundownItem[], 
    newTitle: string, 
    newColumns?: Column[], 
    newTimezone?: string, 
    newStartTime?: string
  ) => {
    const newSignature = createContentSignature({
      items: newItems || [],
      title: newTitle || '',
      columns: [], // Not used in content signature
      timezone: '', // Not used in content signature
      startTime: '', // Not used in content signature
      showDate: null,
      externalNotes: ''
    });
    
    lastSavedDataRef.current = newSignature;
    setHasUnsavedChanges(false);
    console.log('🔄 Updated saved signature from realtime (showcaller-aware), length:', newSignature.length);

    // Brief cooldown
    isInRealtimeCooldown.current = true;
    if (realtimeCooldownRef.current) {
      clearTimer(realtimeCooldownRef.current);
    }
    realtimeCooldownRef.current = setManagedTimeout(() => {
      isInRealtimeCooldown.current = false;
    }, 200);
    }, [clearTimer, setManagedTimeout]);

  const setApplyingRemoteUpdate = useCallback((applying: boolean) => {
    isApplyingRemoteUpdateRef.current = applying;

    if (!applying) {
      isInRealtimeCooldown.current = true;
      if (realtimeCooldownRef.current) {
        clearTimer(realtimeCooldownRef.current);
      }
      realtimeCooldownRef.current = setManagedTimeout(() => {
        isInRealtimeCooldown.current = false;
      }, 200);
    }
    }, [clearTimer, setManagedTimeout]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (realtimeCooldownRef.current) {
        clearTimer(realtimeCooldownRef.current);
      }
      if (showcallerBlockTimeoutRef.current) {
        clearTimer(showcallerBlockTimeoutRef.current);
      }
    };
  }, [clearTimer]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized,
    setIsLoading,
    updateSavedSignature,
    setApplyingRemoteUpdate,
    setUserTyping,
    setShowcallerUpdate
  };
};
