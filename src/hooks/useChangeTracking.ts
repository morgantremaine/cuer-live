
import { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from '@/types/columns';
import { useUniversalTimer } from './useUniversalTimer';

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
  const createContentSignature = useCallback(() => {
    // If showcaller is active, don't create new signatures
    if (showcallerActiveRef.current) {
      console.log('🚫 Showcaller active - using cached signature to prevent change detection');
      return lastSavedDataRef.current;
    }

    // Create signature with ONLY content fields - NO showcaller data
    const signature = JSON.stringify({
      items: (items || []).map(item => ({
        // Core content fields only
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        startTime: item.startTime,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        rowNumber: item.rowNumber
        // EXPLICITLY EXCLUDED: status, elapsedTime, currentSegmentId
      })),
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });
    
    console.log('🔍 Created content signature (showcaller-free), items count:', items?.length || 0);
    return signature;
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Track user typing activity
  const setUserTyping = useCallback((typing: boolean) => {
    console.log('⌨️ User typing state changed:', typing);
    userActivelyTypingRef.current = typing;
  }, []);

  // Enhanced showcaller activity tracking with extended blocking
  const setShowcallerUpdate = useCallback((isShowcallerUpdate: boolean) => {
    console.log('📺 Showcaller update state change:', showcallerActiveRef.current, '->', isShowcallerUpdate);
    
    showcallerActiveRef.current = isShowcallerUpdate;
    
    if (isShowcallerUpdate) {
      console.log('📺 Showcaller active - completely blocking change detection');
      
      // Clear any existing timeout
      if (showcallerBlockTimeoutRef.current) {
        clearTimer(showcallerBlockTimeoutRef.current);
      }
      
      // Set extended timeout to ensure showcaller operations complete
      showcallerBlockTimeoutRef.current = setManagedTimeout(() => {
        showcallerActiveRef.current = false;
        console.log('📺 Showcaller timeout expired - change detection can resume');
      }, 8000); // 8 seconds to handle complex showcaller sequences
      
    } else {
      console.log('📺 Showcaller cleared - change detection can resume');
      
      // Clear timeout since showcaller explicitly cleared
      if (showcallerBlockTimeoutRef.current) {
        clearTimer(showcallerBlockTimeoutRef.current);
        showcallerBlockTimeoutRef.current = null;
      }
    }
  }, [setManagedTimeout, clearTimer]);

  // Initialize tracking
  useEffect(() => {
    if (!isInitialized) {
      if (initializationTimeoutRef.current) {
        clearTimer(initializationTimeoutRef.current);
      }

      initializationTimeoutRef.current = setManagedTimeout(() => {
        const currentSignature = createContentSignature();
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
  }, [isInitialized, createContentSignature, setManagedTimeout, clearTimer]);

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
    const currentSignature = createContentSignature();
    
    // Only trigger if signature actually changed AND showcaller is not active
    if (lastSavedDataRef.current !== currentSignature && !showcallerActiveRef.current) {
      console.log('📝 Content change detected (not showcaller), marking as changed');
      console.log('📝 Previous signature length:', lastSavedDataRef.current.length);
      console.log('📝 Current signature length:', currentSignature.length);
      
      setHasUnsavedChanges(true);
    } else {
      console.log('📝 No content change detected (showcaller-aware check)');
    }
  }, [items, rundownTitle, columns, timezone, startTime, isInitialized, isLoading, createContentSignature, isProcessingRealtimeUpdate]);

  const markAsSaved = useCallback((
    savedItems: RundownItem[], 
    savedTitle: string, 
    savedColumns?: Column[], 
    savedTimezone?: string, 
    savedStartTime?: string
  ) => {
    // Create saved signature excluding showcaller fields
    const savedSignature = JSON.stringify({
      items: (savedItems || []).map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        startTime: item.startTime,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        rowNumber: item.rowNumber
      })),
      title: savedTitle || '',
      columns: savedColumns || [],
      timezone: savedTimezone || '',
      startTime: savedStartTime || ''
    });
    
    lastSavedDataRef.current = savedSignature;
    setHasUnsavedChanges(false);
    console.log('✅ Marked as saved (showcaller-aware), signature length:', savedSignature.length);
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
    const newSignature = JSON.stringify({
      items: (newItems || []).map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        duration: item.duration,
        startTime: item.startTime,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        rowNumber: item.rowNumber
      })),
      title: newTitle || '',
      columns: newColumns || [],
      timezone: newTimezone || '',
      startTime: newStartTime || ''
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
