
import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useRundownBasicState } from './useRundownBasicState';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const navigate = useNavigate();
  const { rundownId } = useRundownBasicState();
  const { updateRundown, saveRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const [isSaving, setIsSaving] = React.useState(false);
  const isNavigatingRef = useRef(false);
  const hasAttemptedSaveRef = useRef(false);

  const {
    hasUnsavedChanges,
    markAsSaved,
    updateSavedSignature,
    setApplyingRemoteUpdate,
    setIgnoreShowcallerChanges
  } = useChangeTracking(
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime,
    isProcessingRealtimeUpdate
  );

  // Auto-save function with proper new rundown handling
  const performAutoSave = useCallback(async () => {
    // Skip if conditions are not met
    if (isProcessingRealtimeUpdate || isNavigatingRef.current || isSaving) {
      console.log('⏭️ Skipping auto-save - processing realtime update, navigating, or already saving');
      return;
    }

    // Create current data signature for comparison
    const currentData = {
      title: rundownTitle,
      items: items || [],
      columns: columns || [],
      timezone,
      start_time: rundownStartTime
    };

    const currentSignature = JSON.stringify(currentData);

    // Skip if data hasn't changed since last save
    if (currentSignature === lastSaveDataRef.current) {
      console.log('⏭️ Skipping auto-save - no changes detected');
      return;
    }

    // For new rundowns (rundownId is undefined), check if there's meaningful content
    if (!rundownId) {
      // Skip saving if it's just the default state with minimal content
      if (rundownTitle === 'Live Broadcast Rundown' && (!items || items.length <= 3)) {
        console.log('⏭️ Skipping auto-save - insufficient content for new rundown');
        return;
      }
      
      // Mark that we've attempted to save to prevent duplicate attempts
      if (!hasAttemptedSaveRef.current) {
        hasAttemptedSaveRef.current = true;
      }
    }

    console.log('💾 Auto-saving rundown...', {
      rundownId: rundownId || 'undefined (new)',
      title: rundownTitle,
      itemsCount: items?.length || 0,
      timezone,
      startTime: rundownStartTime,
      isNewRundown: !rundownId
    });

    setIsSaving(true);

    try {
      if (rundownId) {
        // Update existing rundown
        await updateRundown(rundownId, {
          title: rundownTitle,
          items: items || [],
          columns: columns || [],
          timezone,
          start_time: rundownStartTime
        });
        console.log('✅ Auto-save completed successfully (update)');
      } else {
        // Save new rundown and navigate to it
        const newRundown = {
          id: '', // Let the database generate this
          user_id: '', // Will be set by saveRundown
          title: rundownTitle || 'Untitled Rundown',
          items: items || [],
          columns: columns || [],
          timezone: timezone || 'UTC',
          start_time: rundownStartTime || '09:00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false,
          undo_history: []
        };
        
        console.log('💾 Creating new rundown with data:', newRundown);
        const newRundownId = await saveRundown(newRundown);
        console.log('✅ New rundown created successfully:', newRundownId);
        
        if (newRundownId) {
          isNavigatingRef.current = true;
          console.log('🚀 Navigating to new rundown:', newRundownId);
          navigate(`/rundown/${newRundownId}`, { replace: true });
          
          // Reset navigation flag after a brief delay
          setTimeout(() => {
            isNavigatingRef.current = false;
            hasAttemptedSaveRef.current = false;
          }, 1000);
        }
      }

      // Update our tracking
      lastSaveDataRef.current = currentSignature;
      markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);

    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      hasAttemptedSaveRef.current = false; // Reset on failure to allow retry
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, rundownTitle, items, columns, timezone, rundownStartTime, updateRundown, saveRundown, markAsSaved, isProcessingRealtimeUpdate, navigate, isSaving]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || isProcessingRealtimeUpdate || isNavigatingRef.current || isSaving) {
      return;
    }

    console.log('🔄 Changes detected, scheduling auto-save...', {
      hasUnsavedChanges,
      rundownId: rundownId || 'undefined (new)',
      title: rundownTitle,
      itemsLength: items?.length || 0
    });

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000); // 2 second delay

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, performAutoSave, isProcessingRealtimeUpdate, isSaving]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setIgnoreShowcallerChanges
  };
};
