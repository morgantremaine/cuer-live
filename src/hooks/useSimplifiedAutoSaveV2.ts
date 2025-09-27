import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { logger } from '@/utils/logger';
import { debugLogger } from '@/utils/debugLogger';
import { useEnhancedFieldDeltaSave } from './useEnhancedFieldDeltaSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { getTabId } from '@/utils/tabUtils';

/**
 * Simplified AutoSave V2 - For per-cell save feature flag users
 * 
 * REMOVES ALL BLOCKING LOGIC:
 * - No blockUntilLocalEditRef
 * - No cooldownUntilRef
 * - No complex timing mechanisms
 * - Instant saves with minimal delay
 * - Simplified conflict resolution
 */
export const useSimplifiedAutoSaveV2 = (
  state: RundownState,
  rundownId: string | null,
  onSaved: (meta?: { updatedAt?: string; docVersion?: number }) => void,
  pendingStructuralChangeRef?: React.MutableRefObject<boolean>,
  suppressUntilRef?: React.MutableRefObject<number>,
  isInitiallyLoaded?: boolean,
  isSharedView = false
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { shouldBlockAutoSave } = useCellUpdateCoordination();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const undoActiveRef = useRef(false);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const currentSaveSignatureRef = useRef<string>('');
  const editBaseDocVersionRef = useRef<number>(0);
  
  // SIMPLIFIED: Only track typing for instant feedback
  const lastEditAtRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  
  // ULTRA-SIMPLIFIED TIMING: Instant saves
  const TYPING_IDLE_MS = 300;  // Very short delay
  const MAX_SAVE_DELAY = 1000; // Quick max delay
  
  const saveInProgressRef = useRef(false);
  
  // Stable onSaved ref to avoid effect churn from changing callbacks
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // Create content signature from current state
  const createContentSignature = useCallback(() => {
    return createContentSignatureFromState(state);
  }, [state]);

  // Simplified signature creation - no caching complexity
  const createContentSignatureFromState = useCallback((targetState: RundownState) => {
    const cleanItems = targetState.items?.map((item: any) => {
      const cleanItem: any = {
        id: item.id,
        type: item.type,
        name: item.name,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        duration: item.duration,
        color: item.color,
        isFloating: item.isFloating,
        customFields: item.customFields || {}
      };
      
      // Remove any undefined/null values to ensure clean comparison
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined || cleanItem[key] === null) {
          cleanItem[key] = '';
        }
      });
      
      return cleanItem;
    }) || [];

    const signature = JSON.stringify({
      items: cleanItems,
      title: targetState.title || '',
      startTime: targetState.startTime || '',
      timezone: targetState.timezone || '',
      showDate: targetState.showDate ? `${targetState.showDate.getFullYear()}-${String(targetState.showDate.getMonth() + 1).padStart(2, '0')}-${String(targetState.showDate.getDate()).padStart(2, '0')}` : null,
      externalNotes: targetState.externalNotes || ''
    });
    
    return signature;
  }, []);

  // Simplified baseline priming
  const lastPrimedRundownRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (rundownId !== lastPrimedRundownRef.current && lastPrimedRundownRef.current !== null) {
      console.log('🔄 AutoSaveV2: switching rundowns, resetting baseline', { 
        from: lastPrimedRundownRef.current, 
        to: rundownId 
      });
      lastSavedRef.current = '';
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    }
  }, [rundownId]);

  useEffect(() => {
    if (!isInitiallyLoaded) return;

    // Prime baseline once per rundown when initial load completes
    if (rundownId !== lastPrimedRundownRef.current) {
      const sig = createContentSignature();
      
      // Safety check to prevent crashes
      if (!sig) {
        logger.warn('AutoSaveV2: createContentSignature returned undefined, skipping baseline prime');
        return;
      }
      
      lastSavedRef.current = sig;
      lastPrimedRundownRef.current = rundownId;
      
      // Initialize field delta system with safety check
      if (initializeSavedState) {
        initializeSavedState(state);
      } else {
        logger.warn('AutoSaveV2: initializeSavedState not available yet');
      }
      
      // Clear bootstrapping flag
      setIsBootstrapping(false);
      
      // Clear unsaved changes flag
      setTimeout(() => {
        onSavedRef.current?.();
      }, 100);
      
      console.log('✅ AutoSaveV2: primed baseline for rundown', { 
        rundownId, 
        length: sig.length 
      });
    }
  }, [isInitiallyLoaded, rundownId, createContentSignature]);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('🎯 UndoV2 active set to:', active);
  };

  // Simplified update tracking
  const trackMyUpdate = useCallback((timestamp: string) => {
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Field-level delta saving for collaborative editing
  const { saveDeltaState, initializeSavedState, trackFieldChange } = useEnhancedFieldDeltaSave(
    rundownId,
    trackMyUpdate
  );

  // ULTRA-SIMPLIFIED typing tracker - no blocking logic
  const markActiveTyping = useCallback(() => {
    const now = Date.now();
    lastEditAtRef.current = now;
    hasUnsavedChangesRef.current = true;
    
    console.log('✅ AutoSaveV2: typing detected - scheduling instant save');
    
    // IMMEDIATE UI UPDATE: Show unsaved changes when typing starts
    if (isSaving) {
      setIsSaving(false);
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule very quick save
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 AutoSaveV2: instant save triggered');
      performSave(false, isSharedView);
    }, TYPING_IDLE_MS);
    
  }, [isSaving]);

  // Check if user is currently typing - simplified
  const isTypingActive = useCallback(() => {
    const timeSinceEdit = Date.now() - lastEditAtRef.current;
    return timeSinceEdit < TYPING_IDLE_MS + 100;
  }, []);

  // SIMPLIFIED SAVE LOGIC - No blocking, no complex timing
  const performSave = useCallback(async (forced = false, isSharedViewMode = false) => {
    // Skip demo rundown
    if (rundownId === DEMO_RUNDOWN_ID) {
      console.log('⏭️ AutoSaveV2: skipping demo rundown save');
      return;
    }

    // Skip if no rundown ID
    if (!rundownId) {
      console.log('⏭️ AutoSaveV2: no rundown ID');
      return;
    }

    // Skip shared view saves
    if (isSharedViewMode) {
      console.log('⏭️ AutoSaveV2: skipping shared view save');
      return;
    }

    // Skip if undo active
    if (undoActiveRef.current) {
      console.log('⏭️ AutoSaveV2: skipping save - undo active');
      return;
    }

    // Skip if already saving (simple check)
    if (saveInProgressRef.current) {
      console.log('⏭️ AutoSaveV2: save already in progress');
      return;
    }

    // Check for changes
    const currentSignature = createContentSignature();
    if (!forced && currentSignature === lastSavedRef.current) {
      console.log('⏭️ AutoSaveV2: no changes detected');
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    hasUnsavedChangesRef.current = false;

    try {
      console.log('💾 AutoSaveV2: Starting simplified save');
      
      // Use field-level delta save system
      const saveResult = await saveDeltaState(state);
      
      // Update baseline
      lastSavedRef.current = currentSignature;
      
      // Track our own update
      trackMyUpdate(saveResult.updatedAt);
      
      // Register recent save for recovery
      registerRecentSave(rundownId, saveResult.updatedAt);
      
      // Call success callback
      onSavedRef.current?.({ 
        updatedAt: saveResult.updatedAt, 
        docVersion: saveResult.docVersion 
      });
      
      console.log('✅ AutoSaveV2: Save completed successfully');
      
    } catch (error) {
      console.error('❌ AutoSaveV2: Save failed:', error);
      hasUnsavedChangesRef.current = true; // Restore unsaved flag on error
      
      // Show toast for critical errors
      toast({
        title: "Save failed",
        description: "Your changes couldn't be saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [rundownId, createContentSignature, saveDeltaState, state, trackMyUpdate, toast]);

  // Force save function
  const forceSave = useCallback(() => {
    console.log('🔨 AutoSaveV2: Force save requested');
    performSave(true, isSharedView);
  }, [performSave, isSharedView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    markActiveTyping,
    isTypingActive,
    setUndoActive,
    forceSave,
    triggerImmediateSave: forceSave, // Alias for compatibility
    trackFieldChange,
    setTrackOwnUpdate,
    isSaving,
    hasUnsavedChanges: hasUnsavedChangesRef.current,
    isBootstrapping
  };
};