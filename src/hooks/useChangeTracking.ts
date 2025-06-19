
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
  const showcallerUpdateRef = useRef(false);

  // Enhanced signature creation that excludes showcaller-only changes
  const createContentSignature = useCallback(() => {
    // Only include actual content, not showcaller state - be very explicit about what we include
    const signature = JSON.stringify({
      items: (items || []).map(item => ({
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
        images: item.images, // Critical: Make sure images field is included
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        elapsedTime: item.elapsedTime,
        rowNumber: item.rowNumber
        // Explicitly exclude: status, currentSegmentId and any other showcaller-specific fields
      })),
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });
    
    console.log('🔍 Created content signature, items count:', items?.length || 0);
    return signature;
  }, [items, rundownTitle, columns, timezone, startTime]);

  // Track user typing activity
  const setUserTyping = useCallback((typing: boolean) => {
    console.log('⌨️ User typing state changed:', typing);
    userActivelyTypingRef.current = typing;
    if (typing) {
      lastUserInteractionRef.current = Date.now();
    }
  }, []);

  // Track showcaller updates to prevent them from triggering change detection
  const setShowcallerUpdate = useCallback((isShowcallerUpdate: boolean) => {
    showcallerUpdateRef.current = isShowcallerUpdate;
    if (isShowcallerUpdate) {
      console.log('📺 Marking as showcaller update - excluding from change detection');
    }
  }, []);

  // Initialize tracking after a shorter delay
  useEffect(() => {
    if (!isInitialized) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Shorter timeout for faster initialization
      initializationTimeoutRef.current = setTimeout(() => {
        const currentSignature = createContentSignature();
        lastSavedDataRef.current = currentSignature;
        setIsInitialized(true);
        console.log('🔄 Change tracking initialized with signature length:', currentSignature.length);
      }, 500); // Reduced from 1000ms
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [isInitialized, createContentSignature]);

  // Simplified change detection with enhanced logging for images
  useEffect(() => {
    // Only essential protection checks
    if (!isInitialized || 
        isLoading || 
        isProcessingRealtimeUpdate || 
        isApplyingRemoteUpdateRef.current) {
      console.log('🚫 Skipping change detection due to flags:', {
        initialized: isInitialized,
        loading: isLoading,
        realtime: isProcessingRealtimeUpdate,
        applying: isApplyingRemoteUpdateRef.current
      });
      return;
    }

    // Create new signature
    const currentSignature = createContentSignature();
    
    // Only trigger if signature actually changed
    if (lastSavedDataRef.current !== currentSignature) {
      console.log('📝 Content change detected, marking as changed');
      console.log('📝 Previous signature length:', lastSavedDataRef.current.length);
      console.log('📝 Current signature length:', currentSignature.length);
      
      // Enhanced debugging for image changes
      if (lastSavedDataRef.current && currentSignature) {
        try {
          const prevObj = JSON.parse(lastSavedDataRef.current);
          const currObj = JSON.parse(currentSignature);
          
          // Check specifically for image field changes
          const imageChanges = currObj.items?.filter((item: any, index: number) => {
            const prevItem = prevObj.items?.[index];
            if (!prevItem) return true; // New item
            
            const imageChanged = prevItem.images !== item.images;
            if (imageChanged) {
              console.log('🖼️ Image change detected for item:', item.id, 'from:', prevItem.images, 'to:', item.images);
            }
            return imageChanged;
          });
          
          if (imageChanges?.length > 0) {
            console.log('🖼️ Total image changes detected:', imageChanges.length, 'items');
          }
          
          // Also check for any item-level changes
          const changedItems = currObj.items?.filter((item: any, index: number) => {
            const prevItem = prevObj.items?.[index];
            if (!prevItem) return true; // New item
            
            const itemSignature = JSON.stringify(item);
            const prevItemSignature = JSON.stringify(prevItem);
            const hasChanges = itemSignature !== prevItemSignature;
            
            if (hasChanges) {
              console.log('📝 Item changes detected for:', item.id, 'item index:', index);
            }
            
            return hasChanges;
          });
          
          console.log('📝 Items count changed:', prevObj.items?.length, '->', currObj.items?.length);
          console.log('📝 Changed items count:', changedItems?.length || 0);
          
        } catch (e) {
          console.log('📝 Could not parse signatures for comparison:', e);
        }
      }
      
      setHasUnsavedChanges(true);
    } else {
      console.log('📝 No signature change detected - signatures match');
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
        images: item.images, // Critical: Make sure images field is included
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        elapsedTime: item.elapsedTime,
        rowNumber: item.rowNumber
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
        !isApplyingRemoteUpdateRef.current) {
      console.log('📝 Manually marking as changed');
      setHasUnsavedChanges(true);
    }
  }, [isInitialized, isLoading, isProcessingRealtimeUpdate]);

  // Simplified signature update 
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
        images: item.images, // Critical: Make sure images field is included
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        isFloated: item.isFloated,
        customFields: item.customFields,
        segmentName: item.segmentName,
        elapsedTime: item.elapsedTime,
        rowNumber: item.rowNumber
      })),
      title: newTitle || '',
      columns: newColumns || [],
      timezone: newTimezone || '',
      startTime: newStartTime || ''
    });
    
    lastSavedDataRef.current = newSignature;
    setHasUnsavedChanges(false);
    console.log('🔄 Updated saved signature from realtime, length:', newSignature.length);

    // Short cooldown period to prevent immediate re-triggers
    isInRealtimeCooldown.current = true;
    if (realtimeCooldownRef.current) {
      clearTimeout(realtimeCooldownRef.current);
    }
    realtimeCooldownRef.current = setTimeout(() => {
      isInRealtimeCooldown.current = false;
      console.log('❄️ Realtime cooldown ended');
    }, 200); // Very short cooldown
  }, []);

  // Method to set the applying remote update flag
  const setApplyingRemoteUpdate = useCallback((applying: boolean) => {
    isApplyingRemoteUpdateRef.current = applying;

    if (!applying) {
      // When finishing remote update, brief cooldown
      lastProcessingFlagClearTime.current = Date.now();
      isInRealtimeCooldown.current = true;
      if (realtimeCooldownRef.current) {
        clearTimeout(realtimeCooldownRef.current);
      }
      realtimeCooldownRef.current = setTimeout(() => {
        isInRealtimeCooldown.current = false;
        console.log('❄️ Brief realtime cooldown ended after remote update');
      }, 200); // Very short cooldown
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
    setUserTyping,
    setShowcallerUpdate
  };
};
