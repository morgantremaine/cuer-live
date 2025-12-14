import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { detectDataConflict } from '@/utils/conflictDetection';
import { createContentSignature, createLightweightContentSignature } from '@/utils/contentSignature';
import { useKeystrokeJournal } from './useKeystrokeJournal';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { usePerCellSaveCoordination } from './usePerCellSaveCoordination';
import { getTabId } from '@/utils/tabUtils';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: (meta?: { updatedAt?: string; completionCount?: number }) => void,
  pendingStructuralChangeRef?: React.MutableRefObject<boolean>,
  suppressUntilRef?: React.MutableRefObject<number>,
  isInitiallyLoaded?: boolean,
  blockUntilLocalEditRef?: React.MutableRefObject<boolean>,
  cooldownUntilRef?: React.MutableRefObject<number>,
  applyingCellBroadcastRef?: React.MutableRefObject<boolean>,
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
  const saveQueueRef = useRef<{ signature: string; retryCount: number } | null>(null);
  const currentSaveSignatureRef = useRef<string>('');
  
  // Enhanced cooldown management with explicit flags (passed as parameters)
   // Simplified autosave system - reduce complexity with performance optimization
   const lastEditAtRef = useRef<number>(0);
   const hasUnsavedChangesRef = useRef<boolean>(false);
   const [perCellHasUnsavedChanges, setPerCellHasUnsavedChanges] = useState<boolean>(false);
  
  // Consistent timing for all rundown sizes - no functional differences
  const getOptimizedTimings = useCallback(() => {
    // All rundowns use the same reliable timing - only memory optimizations differ
    return {
      typingIdleMs: 1500,  // Consistent for all sizes
      maxSaveDelay: 5000,  // Consistent for all sizes  
      microResaveMs: 200   // Consistent for all sizes
    };
  }, []);
  
  const { typingIdleMs, maxSaveDelay, microResaveMs } = getOptimizedTimings();
  const saveInProgressRef = useRef(false);
  const saveInitiatedWhileActiveRef = useRef(false);
  const microResaveTimeoutRef = useRef<NodeJS.Timeout>();
  const postTypingSafetyTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingFollowUpSaveRef = useRef(false);
  const recentKeystrokes = useRef<number>(0);
  const maxDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const microResaveAttemptsRef = useRef(0); // guard against infinite micro-resave loops
  const lastMicroResaveSignatureRef = useRef<string>(''); // prevent duplicate micro-resaves
  const performSaveRef = useRef<any>(null); // late-bound to avoid order issues
  
  // Performance-optimized keystroke journal for reliable content tracking
  const keystrokeJournal = useKeystrokeJournal({
    rundownId,
    state,
    enabled: true,
    performanceMode: (state.items?.length || 0) > 150 // Enable performance mode for large rundowns
  });

  // Stable onSaved ref to avoid effect churn from changing callbacks
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // Create content signature from current state (backwards compatibility)
  const createCurrentContentSignature = useCallback(() => {
    const signature = createContentSignatureFromState(state);
    return signature;
    
    console.log('💾 AUTOSAVE: Created current signature', {
      itemCount: state.items?.length || 0,
      signatureLength: signature.length,
      hasUnsavedChanges: state.hasUnsavedChanges,
      matchesLastSaved: signature === lastSavedRef.current
    });
    
    return signature;
  }, [state]);

  // Initial load cooldown removed - allow instant editing

  // Performance-optimized signature cache to avoid repeated JSON.stringify calls
  const signatureCache = useRef<Map<string, { signature: string; timestamp: number }>>(new Map());
  
  // PHASE 2.2: Dynamic cache TTL based on rundown size for better performance
  const itemCount = state.items?.length || 0;
  const SIGNATURE_CACHE_TTL = itemCount > 100 ? 5000 : 1000; // 5s for large rundowns, 1s for small
  
  // PHASE 2: Enhanced memory cleanup for signature cache
  useEffect(() => {
    const currentItemCount = state.items?.length || 0;
    
    // More aggressive cleanup for rundowns >100 items
    const cleanupInterval = currentItemCount > 100 ? 5000 : 10000;
    
    const interval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      // Clear old cache entries to prevent memory accumulation
      for (const [key, value] of signatureCache.current.entries()) {
        if (now - value.timestamp > SIGNATURE_CACHE_TTL) {
          signatureCache.current.delete(key);
          cleanedCount++;
        }
      }
      
      // Force garbage collection hint for very large caches
      if (signatureCache.current.size > 100) {
        signatureCache.current.clear();
        console.log('🧹 AutoSave: Cleared signature cache for memory optimization');
      }
    }, cleanupInterval);
    
    return () => clearInterval(interval);
  }, [state.items?.length, SIGNATURE_CACHE_TTL]);

  // PHASE 2.3: Debounced signature creation refs
  const signatureDebounceTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSignatureRequestRef = useRef<{
    state: RundownState;
    resolve: (signature: string) => void;
  } | null>(null);
  
  // Create content signature from any state (for use with snapshots) with caching and debouncing
  const createContentSignatureFromState = useCallback((targetState: RundownState) => {
    const itemCount = targetState.items?.length || 0;
    
    // SIMPLIFIED: Use cheap ID-based cache key instead of expensive content hashing
    // The cache is just an optimization - cache misses are fine, but blocking main thread is not
    const itemIds = targetState.items?.map(item => item.id).join(',') || '';
    const cacheKey = `${rundownId}:${itemCount}:${itemIds}:${targetState.title || ''}`;
    
    // Check cache first for performance
    const cached = signatureCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SIGNATURE_CACHE_TTL) {
      debugLogger.autosave(`Using cached signature for ${itemCount} items`);
      return cached.signature;
    }
    
    // PHASE 2.1: Always use lightweight signatures for better performance (32-bit hash, ~1 in 4B collision chance)
    if (itemCount > 0) {
      const lightweightSignature = createLightweightContentSignature({
        items: targetState.items || [],
        title: targetState.title || '',
        columns: [], // Not used in lightweight content signature
        timezone: '', // Not used in lightweight content signature
        startTime: '', // Not used in lightweight content signature
        showDate: targetState.showDate || null,
        externalNotes: targetState.externalNotes || ''
      });
      
      // Cache the result
      signatureCache.current.set(cacheKey, {
        signature: lightweightSignature,
        timestamp: Date.now()
      });
      
      debugLogger.autosave(`Created lightweight signature for ${itemCount} items`);
      return lightweightSignature;
    }
    
    // Standard signature for smaller rundowns - use content-only function from utils
    const signature = createContentSignature({
      items: targetState.items || [],
      title: targetState.title || '',
      columns: [], // Not used in content signature
      timezone: '', // Not used in content signature
      startTime: '', // Not used in content signature
      showDate: targetState.showDate || null,
      externalNotes: targetState.externalNotes || ''
    });
    
    // Cache the result
    signatureCache.current.set(cacheKey, {
      signature,
      timestamp: Date.now()
    });
    
    console.log('💾 AUTOSAVE: Created content signature', {
      itemCount,
      signatureLength: signature.length,
      signatureType: 'standard',
      excludedFromSignature: ['columns', 'timezone', 'startTime'],
      cached: false
    });
    return signature;
  }, []);

  // Stabilized baseline priming - only reset on actual rundown switches, not during init
  const lastPrimedRundownRef = useRef<string | null>(null);
  const componentInstanceRef = useRef<string>(Math.random().toString(36));
  
  useEffect(() => {
    // Only reset baseline when truly switching between different rundowns
    // Don't reset during initial load or if rundownId is the same
    if (rundownId !== lastPrimedRundownRef.current && lastPrimedRundownRef.current !== null) {
      console.log('🔄 AutoSave: switching rundowns, resetting baseline', { 
        from: lastPrimedRundownRef.current, 
        to: rundownId 
      });
      lastSavedRef.current = '';
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (postTypingSafetyTimeoutRef.current) {
        clearTimeout(postTypingSafetyTimeoutRef.current);
      }
    }
  }, [rundownId]);

  useEffect(() => {
    if (!isInitiallyLoaded) return;

    // Generate new instance ID for each component mount
    const currentInstance = Math.random().toString(36);
    componentInstanceRef.current = currentInstance;

    // Prime baseline for new component instances OR different rundowns
    const needsBaseline = rundownId !== lastPrimedRundownRef.current;
    
    if (needsBaseline) {
      // SAFE FIX: Use actual current signature as baseline instead of empty string
      const currentSignature = createCurrentContentSignature();
      lastSavedRef.current = currentSignature;
      lastPrimedRundownRef.current = rundownId;
      
      // Baseline tracking handled by lastSavedRef signature string
      // No need to initialize full state copy (that was legacy code)
      
      // Clear bootstrapping flag to prevent spinner flicker
      setIsBootstrapping(false);
      
      // Baseline primed silently
    }
  }, [isInitiallyLoaded, rundownId, createCurrentContentSignature]);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('🎯 Undo active set to:', active);
  };

  // Check if per-cell save is enabled for this rundown
  const isPerCellEnabled = Boolean(state.perCellSaveEnabled);
  
  // Debug log to confirm per-cell save status
  useEffect(() => {
    if (rundownId && import.meta.env.DEV && localStorage.getItem('debugPerCellSave') === '1') {
      console.log('🧪 PER-CELL SAVE: Auto-save system status', {
        rundownId,
        isPerCellEnabled,
        perCellSaveEnabled: state.perCellSaveEnabled
      });
    }
  }, [rundownId, isPerCellEnabled, state.perCellSaveEnabled]);

  // Get current user ID from state for structural operations
  const currentUserId = (state as any).currentUserId;

  // Check if user is currently typing with improved logic and debugging
  const isTypingActive = useCallback(() => {
    const timeSinceEdit = Date.now() - lastEditAtRef.current;
    const typingFlagActive = userTypingRef.current;
    
    // Check the explicit typing flag first
    if (typingFlagActive) {
      // If it's been too long since the last edit, clear the flag
      if (timeSinceEdit > typingIdleMs + 500) {
        userTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = undefined;
        }
        return false;
      }
      return true;
    }
    return false;
  }, [typingIdleMs]);

  // Create callback functions for per-cell save coordination
  const handlePerCellSaveStart = useCallback(() => {
    setIsSaving(true);
  }, []);

  const handlePerCellSaveComplete = useCallback((completionCount?: number) => {
    setIsSaving(false);
    
    // CRITICAL: Sync all unsaved flags after successful per-cell save
    // This prevents false positives in paranoid save timer
    hasUnsavedChangesRef.current = false;
    setPerCellHasUnsavedChanges(false);
    
    // Update the signature baseline to match current state
    // This keeps useChangeTracking's signature-based detection in sync
    const currentSignature = createContentSignatureFromState(state);
    lastSavedRef.current = currentSignature;
    
    // Forward completion count to parent so UI indicator can show "Saved"
    onSaved({ completionCount });
  }, [onSaved, state, createContentSignatureFromState]);

  const handlePerCellUnsavedChanges = useCallback(() => {
    hasUnsavedChangesRef.current = true;
    setPerCellHasUnsavedChanges(true);
  }, []);

  const handlePerCellChangesSaved = useCallback(() => {
    hasUnsavedChangesRef.current = false;
    setPerCellHasUnsavedChanges(false);
  }, []);

  // SINGLE POINT: Update baseline after ANY server data load
  // This is the ONE place where we sync signature baseline with server state
  const updateBaselineFromServerData = useCallback(() => {
    const currentSignature = createContentSignatureFromState(state);
    lastSavedRef.current = currentSignature;
    hasUnsavedChangesRef.current = false;
    setPerCellHasUnsavedChanges(false);
    console.log('📊 Baseline updated from server data');
  }, [state, createContentSignatureFromState]);

  const handlePerCellSaveError = useCallback((error: string) => {
    // Store reference for retry button
    const retryFn = saveCoordinatedStateRef.current?.retryFailedSaves;
    
    toast({
      title: "Save failed",
      description: error,
      variant: "destructive",
      duration: 0 // Persistent until dismissed
    });
    
    // Log retry availability for user
    if (retryFn) {
      console.log('💡 To retry failed saves, check the save indicator');
    }
  }, [toast]);

  // Store saveCoordinatedState ref for error handler
  const saveCoordinatedStateRef = useRef<any>(null);

  // Unified save coordination - per-cell save is always enabled
  const saveCoordination = usePerCellSaveCoordination({
    rundownId,
    isPerCellEnabled,
    currentUserId,
    onSaveStart: handlePerCellSaveStart,
    onSaveComplete: handlePerCellSaveComplete,
    onUnsavedChanges: handlePerCellUnsavedChanges,
    onChangesSaved: handlePerCellChangesSaved,
    onSaveError: handlePerCellSaveError,
    isTypingActive,
    saveInProgressRef,
    typingIdleMs
  });

  const {
    trackFieldChange,
    saveState: saveCoordinatedState,
    hasUnsavedChanges: hasCoordinatedUnsavedChanges,
    handleStructuralOperation,
    retryFailedSaves,
    getFailedSavesCount
  } = saveCoordination;

  // Store ref for error handler
  saveCoordinatedStateRef.current = saveCoordination;

  // Per-cell save is always enabled - delta save system removed

  // Enhanced typing tracker with immediate save cancellation and proper timeout management
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const userTypingRef = useRef(false);
  
  const markActiveTyping = useCallback(() => {
    const now = Date.now();
    lastEditAtRef.current = now;
    recentKeystrokes.current = now;
    userTypingRef.current = true; // Set user typing flag
    microResaveAttemptsRef.current = 0; // Reset circuit breaker on new typing
    
    // Set hasUnsavedChanges regardless of save mode
    // Per-cell save will also trigger this via onUnsavedChanges callback
    hasUnsavedChangesRef.current = true;
    
    // CRITICAL: Clear blockUntilLocalEditRef on any typing - highest priority
    if (blockUntilLocalEditRef && blockUntilLocalEditRef.current) {
      debugLogger.autosave('AutoSave: local edit detected - re-enabling saves');
      blockUntilLocalEditRef.current = false;
    }
    
    // IMMEDIATE SAVE CANCELLATION: Cancel any ongoing save when user types
    if (saveInProgressRef.current) {
      console.log('🛑 AutoSave: CANCELLING save due to typing activity');
      // The save will complete but we'll immediately mark as unsaved
      pendingFollowUpSaveRef.current = false; // Don't follow up
    }
    
    // IMMEDIATE UI UPDATE: Show unsaved changes when typing starts
    if (isSaving) {
      setIsSaving(false);
      console.log('📝 AutoSave: immediately showing unsaved state due to typing');
    }
    
    debugLogger.autosave('AutoSave: typing activity recorded - save cancelled/rescheduled');
    
    // Record typing in journal for debugging and recovery
    keystrokeJournal.recordTyping('user typing activity');
    
    // Record that this save will be initiated while tab is active
    saveInitiatedWhileActiveRef.current = !document.hidden && document.hasFocus();
    
    // Clear all existing timeouts to prevent multiple saves
    if (postTypingSafetyTimeoutRef.current) {
      clearTimeout(postTypingSafetyTimeoutRef.current);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (maxDelayTimeoutRef.current) {
      clearTimeout(maxDelayTimeoutRef.current);
      maxDelayTimeoutRef.current = null;
    }
    
    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to automatically clear typing state and schedule save if needed
    typingTimeoutRef.current = setTimeout(() => {
      userTypingRef.current = false;
      typingTimeoutRef.current = undefined;
      
      // If there are still unsaved changes, schedule a save
      if (hasUnsavedChangesRef.current && !saveInProgressRef.current) {
        setTimeout(() => {
          if (!saveInProgressRef.current && !userTypingRef.current) {
            performSave(false, isSharedView);
          }
        }, 100);
      }
    }, typingIdleMs - 200); // Clear typing state BEFORE the save timeout
    
    // Schedule single save after idle period
    saveTimeoutRef.current = setTimeout(() => {
      debugLogger.autosave('AutoSave: idle timeout reached - triggering save');
      userTypingRef.current = false; // Clear typing flag before save
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      performSave(false, isSharedView);
    }, typingIdleMs);
    
    // Max-delay forced save only if user keeps typing continuously
    maxDelayTimeoutRef.current = setTimeout(() => {
      debugLogger.autosave('AutoSave: max delay reached - forcing save');
      userTypingRef.current = false; // Clear typing flag before save
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      performSave(true, isSharedView);
      maxDelayTimeoutRef.current = null;
    }, maxSaveDelay);
  }, [typingIdleMs, keystrokeJournal, blockUntilLocalEditRef, isSaving]);

  // isTypingActive moved above to fix dependency order

  // Micro-resave with consistent behavior across all rundown sizes
  const scheduleMicroResave = useCallback(() => {
    const currentSignature = createCurrentContentSignature();
    
    // Prevent micro-resave if signature hasn't actually changed
    if (currentSignature === lastMicroResaveSignatureRef.current) {
      console.log('🛑 Micro-resave: no signature change detected - skipping');
      return;
    }
    
    // Additional check: compare with last saved signature to avoid unnecessary resaves
    if (currentSignature === lastSavedRef.current) {
      console.log('🛑 Micro-resave: signature matches last saved - skipping');
      return;
    }
    
    // Consistent circuit breaker for all rundown sizes
    const maxAttempts = 2;
    if (microResaveAttemptsRef.current >= maxAttempts) {
      console.warn('🧯 Micro-resave: circuit breaker activated - max attempts reached', maxAttempts);
      microResaveAttemptsRef.current = 0; // Reset for next time
      return;
    }
    
    microResaveAttemptsRef.current += 1;
    lastMicroResaveSignatureRef.current = currentSignature;
    
    if (microResaveTimeoutRef.current) {
      clearTimeout(microResaveTimeoutRef.current);
    }
    
    console.log('🔄 Micro-resave: scheduling attempt', microResaveAttemptsRef.current);
    microResaveTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Micro-resave: capturing changes made during previous save');
      performSaveRef.current?.();
    }, microResaveMs);
  }, [microResaveMs, createContentSignature]);

  // Enhanced save function with immediate typing cancellation
  const performSave = useCallback(async (isFlushSave = false, isSharedView = false): Promise<void> => {
    // CRITICAL: Gate autosave until initial load is complete
    if (!isInitiallyLoaded) {
      debugLogger.autosave('Save blocked: initial load not complete');
      return;
    }

    // IMMEDIATE TYPING CANCELLATION: Stop saving if user is typing
    if (!isFlushSave && isTypingActive()) {
      console.log('🛑 AutoSave: cancelled - user is actively typing');
      // Don't reschedule here - let markActiveTyping handle it
      return;
    }

    // CRITICAL: Use coordinated blocking to prevent cross-saving and showcaller conflicts
    if (shouldBlockAutoSave()) {
      // Schedule retry if blocked by showcaller operation (short-term block)
      if (!saveTimeoutRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = undefined;
          performSave(isFlushSave, isSharedView);
        }, 500);
      }
      return;
    }

    // REFINED: Background monitor support with extended activity window
    // Extended from 5 seconds to 30 seconds to support second monitor scenarios
    const isTabCurrentlyInactive = document.hidden || !document.hasFocus();
    const hasRecentKeystrokes = Date.now() - recentKeystrokes.current < 30000; // Extended to 30 seconds
    
    // Skip tab inactivity checks for shared views
    if (!isSharedView && !isFlushSave && isTabCurrentlyInactive && !hasRecentKeystrokes) {
      debugLogger.autosave('Save blocked: no recent activity in background tab');
      console.log('🛑 AutoSave: blocked - no recent activity in background tab');
      return;
    }
    
    if (hasRecentKeystrokes && isTabCurrentlyInactive) {
      console.log('✅ AutoSave: allowing save in background tab due to recent activity (30s window)');
    }

    // REMOVED: blockUntilLocalEditRef blocking - embrace immediate saves
    
    if (cooldownUntilRef && cooldownUntilRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: cooldown period active');
      console.log('🛑 AutoSave: blocked - cooldown period active');
      return;
    }
    
    // Legacy suppression cooldown for compatibility
    if (suppressUntilRef?.current && suppressUntilRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: teammate update cooldown active');
      console.log('🛑 AutoSave: blocked - teammate update cooldown active');
      return;
    }
    
    // Use the single isTypingActive function as source of truth for typing state
    // This prevents conflicting typing checks
    const timeSinceLastEdit = Date.now() - lastEditAtRef.current;
    const hasExceededMaxDelay = timeSinceLastEdit > maxSaveDelay;
    
    // Only check typing state if we haven't exceeded max delay
    if (!hasExceededMaxDelay && isTypingActive()) {
      debugLogger.autosave('Save deferred: user actively typing (secondary check)');
      console.log('⌨️ AutoSave: user still typing (secondary check), waiting for idle period');
      return; // Don't reschedule here - markActiveTyping handles it
    }
    
    if (hasExceededMaxDelay && isTypingActive()) {
      console.log('⚡ AutoSave: forcing save after max delay despite typing');
    }
    
    // Final check before saving - cancel if save in progress
    if (saveInProgressRef.current || undoActiveRef.current) {
      debugLogger.autosave('Save blocked: already saving or undo active');
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      
      // SIMPLIFIED: No follow-up saves - typing will trigger new save when stopped
      return;
    }
    
    // Build save payload - MEMORY OPTIMIZED: Don't use journal for large rundowns
    const itemCount = state.items?.length || 0;
    const latestSnapshot = itemCount > 100 ? null : keystrokeJournal.getLatestSnapshot();
    const saveState = latestSnapshot || state;
    
    // Create signature from the snapshot we'll actually save
    const finalSignature = createContentSignatureFromState(saveState);

    // ANTI-WIPE CIRCUIT BREAKER: Prevent saves that would drastically reduce items
    const currentItemCount = saveState.items?.length || 0;
    const lastSavedItemCount = lastSavedRef.current ? 
      (JSON.parse(lastSavedRef.current).items?.length || 0) : 0;
    
    if (currentItemCount === 0 && lastSavedItemCount > 10) {
      console.error('🚨 CIRCUIT BREAKER: Prevented save that would wipe', lastSavedItemCount, 'items');
      debugLogger.autosave('Save blocked: circuit breaker - would wipe significant items');
      return;
    }
    
  // PRECISE SAVE POLICY: Use signature-based change detection with robust validation
  // Only skip save if signatures match, no unsaved changes flag, and we have a baseline
  if (finalSignature === lastSavedRef.current && !state.hasUnsavedChanges && lastSavedRef.current.length > 0) {
    debugLogger.autosave('No changes to save - marking as saved');
    onSavedRef.current?.();
    return;
  }
  
  // Proceed with save when we have actual changes or it's the first save
  debugLogger.autosave('AutoSave: Proceeding with save - hasUnsavedChanges=' + state.hasUnsavedChanges + ', isFirstSave=' + (lastSavedRef.current.length === 0));
    
    // Mark save in progress and capture what we're saving
    setIsSaving(true);
    saveInProgressRef.current = true;
    currentSaveSignatureRef.current = finalSignature;
    
      try {
        if (!rundownId) {
        const { data: teamData, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .limit(1)
          .single();

        if (teamError || !teamData) {
          console.error('❌ Could not get team for new rundown:', teamError);
          return;
        }

        // Get folder ID from location state if available
        const folderId = location.state?.folderId || null;

        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        const newRundownData = {
          title: saveState.title,
          items: saveState.items,
          start_time: saveState.startTime,
          timezone: saveState.timezone,
          show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: saveState.externalNotes,
          team_id: teamData.team_id,
          user_id: currentUserId,
          folder_id: folderId,
          last_updated_by: currentUserId
        } as any;

        // Add tab_id only if schema supports it (graceful degradation)
        try {
          newRundownData.tab_id = getTabId();
        } catch (error) {
          console.warn('tab_id not yet in schema cache for new rundown, skipping:', error);
        }

        const { data: newRundown, error: createError } = await supabase
          .from('rundowns')
          .insert(newRundownData)
          .select()
          .single();

        if (createError) {
          console.error('❌ Save failed:', createError);
        } else {
          // Track the actual timestamp returned by the database via centralized tracker
          if (newRundown?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(newRundown.updated_at);
            const context = newRundown.id ? `realtime-${newRundown.id}` : undefined;
            ownUpdateTracker.track(normalizedTimestamp, context);
            // Register this save to prevent false positives in resumption
            registerRecentSave(newRundown.id, normalizedTimestamp);
          }
          // Update lastSavedRef immediately to prevent retry race condition
          lastSavedRef.current = finalSignature;
          
          // Update lastSavedRef to current state signature after successful save
          const currentSignatureAfterSave = createCurrentContentSignature();
          lastSavedRef.current = currentSignatureAfterSave;
          onSavedRef.current?.({ updatedAt: newRundown?.updated_at ? normalizeTimestamp(newRundown.updated_at) : undefined });
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        try {
          // Per-cell save is always active - per-cell system handles all persistence
          const updatedAt = new Date().toISOString();

          // Track the actual timestamp returned by the database via centralized tracker
          if (updatedAt) {
            const normalizedTs = normalizeTimestamp(updatedAt);
            const context = rundownId ? `realtime-${rundownId}` : undefined;
            ownUpdateTracker.track(normalizedTs, context);
            if (rundownId) {
              registerRecentSave(rundownId, normalizedTs);
            }
          }

          // Update lastSavedRef to current state signature after successful save
          const currentSignatureAfterSave = createCurrentContentSignature();
          lastSavedRef.current = currentSignatureAfterSave;

          // Invoke callback with metadata
          onSavedRef.current?.({ 
            updatedAt
          });
        } catch (saveError: any) {
          // If coordinated save fails due to no changes, that's OK
          if (saveError?.message === 'No changes to save') {
            console.log('ℹ️ Per-cell save: no changes detected');
            onSavedRef.current?.();
          } else {
            throw saveError;
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Save error:', error);
      
      const errorMessage = error?.message?.includes('timeout') 
        ? 'Save timeout - will retry automatically'
        : error?.message?.includes('NetworkError')
        ? 'Network error - will retry when online'
        : 'Unable to save changes. Will retry automatically.';
      
      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
        duration: 0 // Persistent until dismissed
      });
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false; // Reset save progress flag
      saveInitiatedWhileActiveRef.current = false; // Reset active initiation flag
      
      // CRITICAL: Clear typing state when save completes successfully
      if (userTypingRef.current) {
        console.log('✅ Save completed - clearing typing state');
        userTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = undefined;
        }
      }
      
      // Reset max-delay timer and re-arm if user still typing
      if (maxDelayTimeoutRef.current) {
        clearTimeout(maxDelayTimeoutRef.current);
        maxDelayTimeoutRef.current = null;
      }
      if (Date.now() - lastEditAtRef.current < typingIdleMs) {
        if (!maxDelayTimeoutRef.current) {
          maxDelayTimeoutRef.current = setTimeout(() => {
            performSaveRef.current(true);
            maxDelayTimeoutRef.current = null;
          }, maxSaveDelay);
        }
      }
      
      // Clear structural change flag after save completes
      if (pendingStructuralChangeRef) {
        pendingStructuralChangeRef.current = false;
      }
      
      // SIMPLIFIED: No follow-up saves - let typing detection handle new saves
      
      // Simplified retry logic - reduce complexity
      const currentSignature = createCurrentContentSignature();
      if (currentSignature !== currentSaveSignatureRef.current && currentSignature !== lastSavedRef.current) {
        const retryCount = (saveQueueRef.current?.retryCount || 0) + 1;
        
        // Simple retry with conservative backoff
        if (retryCount < 3) {
          console.log('🔄 AutoSave: queuing retry save in 400 ms (attempt', retryCount, ')');
          setTimeout(() => {
            if (!isSaving) {
              performSave(false, isSharedView);
            }
          }, 400);
        } else {
          console.log('ℹ️ AutoSave: no content changes detected');
        }
      }
    }
  }, [rundownId, createContentSignature, navigate, location.state, toast, state.title, state.items, state.startTime, state.timezone, isSaving, suppressUntilRef]);

  // Keep latest performSave reference without retriggering effects
  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Track latest flags for unmount flush and state tracking
  const hasUnsavedRef = useRef(false);
  useEffect(() => { 
    hasUnsavedRef.current = state.hasUnsavedChanges;
    // Don't overwrite hasUnsavedChangesRef in per-cell mode - it's managed by callbacks
    if (!isPerCellEnabled) {
      hasUnsavedChangesRef.current = state.hasUnsavedChanges;
    }
  }, [state.hasUnsavedChanges, isPerCellEnabled]);
  const isLoadedRef = useRef(!!isInitiallyLoaded);
  useEffect(() => { isLoadedRef.current = !!isInitiallyLoaded; }, [isInitiallyLoaded]);
  const rundownIdRef = useRef(rundownId);
  useEffect(() => { rundownIdRef.current = rundownId; }, [rundownId]);

  // Debounced save function that's called by state change handlers, not useEffect
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentSignature = createCurrentContentSignature();
    
    if (currentSignature === lastSavedRef.current) {
      if (state.hasUnsavedChanges) {
        // This is expected during the brief moment after save completion but before MARK_SAVED
        console.log('ℹ️ AUTOSAVE: Save completed, hasUnsavedChanges will be cleared momentarily', {
          currentSigLength: currentSignature.length,
          lastSavedLength: lastSavedRef.current.length,
          signaturesMatch: true,
          itemCount: state.items?.length || 0,
          explanation: 'Normal timing - save completed, waiting for MARK_SAVED action'
        });
        // Don't call onSavedRef here - let the normal save completion handle it
        return;
      }
      console.log('✅ AUTOSAVE: No changes detected, signatures match perfectly');
    }
    
    console.log('🔥 AutoSave: content changed detected', { 
      hasUnsavedChanges: state.hasUnsavedChanges,
      currentSigLength: currentSignature.length,
      lastSavedSigLength: lastSavedRef.current.length,
      signaturesEqual: currentSignature === lastSavedRef.current,
      currentSigHash: currentSignature.slice(0, 100) + '...',
      lastSavedSigHash: lastSavedRef.current.slice(0, 100) + '...'
    });

    const isStructuralChange = pendingStructuralChangeRef?.current || false;
    // Simplified debouncing
    const debounceTime = isStructuralChange ? 50 : 1000; // Faster, simpler timing
    console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges, isMultiUserActive: false });

    saveTimeoutRef.current = setTimeout(async () => {
      console.log('⏱️ AutoSave: executing save now');
      try {
        await performSave(false, isSharedView);
        console.log('✅ AutoSave: save completed successfully');
      } catch (error) {
        console.error('❌ AutoSave: save execution failed:', error);
      }
    }, debounceTime);
  }, [createContentSignature, state.hasUnsavedChanges, performSave, pendingStructuralChangeRef]);

  // Simple effect that schedules a save when hasUnsavedChanges becomes true
  useEffect(() => {
    if (!isInitiallyLoaded) {
      return;
    }

    if (rundownId === DEMO_RUNDOWN_ID) {
      if (state.hasUnsavedChanges) {
        onSavedRef.current?.();
      }
      return;
    }

    if (suppressUntilRef?.current && suppressUntilRef.current > Date.now()) {
      const waitMs = suppressUntilRef.current - Date.now() + 100;
      console.log('🛑 AutoSave(effect): blocked - teammate update cooldown active, retrying after cooldown', { waitMs });
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Schedule retry after cooldown with optimized timing
      saveTimeoutRef.current = setTimeout(async () => {
        // More aggressive about saving when cooldown ends
        try {
          await performSaveRef.current();
        } catch (error) {
          console.error('❌ AutoSave: save execution failed after cooldown:', error);
        }
      }, waitMs);
      return;
    }
    
    if (undoActiveRef.current) {
      console.log('🛑 AutoSave(effect): blocked - undo operation active');
      return;
    }

    if (state.hasUnsavedChanges) {
      // CRITICAL: Skip AutoSave if per-cell save is active and handling saves
      if (isPerCellEnabled) {
        console.log('🧪 AutoSave: per-cell save is handling saves - skipping main auto-save');
        return;
      }
      
      // Record that this save is being initiated while tab is active
      saveInitiatedWhileActiveRef.current = !document.hidden && document.hasFocus();
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const isStructuralChange = pendingStructuralChangeRef?.current || false;
      const isMultiUserActive = suppressUntilRef?.current && suppressUntilRef.current > Date.now() - 1000;
      
      // Simplified timing - no complex conditional logic
      const debounceTime = isStructuralChange ? 100 : 800; // Shorter debounce for faster saves
      
      console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges, isMultiUserActive });

      saveTimeoutRef.current = setTimeout(async () => {
    console.log('⏱️ AutoSave: executing save now');
    
    // CRITICAL: Clear typing flag immediately when save executes to prevent blocking
    userTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
    
    try {
      await performSaveRef.current();
      console.log('✅ AutoSave: save completed successfully');
    } catch (error) {
      console.error('❌ AutoSave: save execution failed:', error);
    }
      }, debounceTime);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (postTypingSafetyTimeoutRef.current) {
        clearTimeout(postTypingSafetyTimeoutRef.current);
      }
      if (maxDelayTimeoutRef.current) {
        clearTimeout(maxDelayTimeoutRef.current);
        maxDelayTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    };
  }, [state.hasUnsavedChanges, isInitiallyLoaded, rundownId, suppressUntilRef]);

  // REMOVED: Save-on-blur/visibility-hidden logic
  // Flushing stale state is more dangerous than losing a few keystrokes
  // Users can manually save if needed

  // Paranoid save timer - ensures old unsaved changes get persisted
  // Runs every 30 seconds and force-saves if changes are sitting unsaved
  // SIMPLIFIED: Only check perCellHasUnsavedChanges since per-cell save is always enabled
  useEffect(() => {
    if (!rundownId || !isInitiallyLoaded || rundownId === DEMO_RUNDOWN_ID) return;

    const paranoidSaveInterval = setInterval(() => {
      // Only trigger if:
      // 1. Per-cell system reports unsaved changes (single source of truth)
      // 2. Not currently typing (respect user input)
      // 3. Not in the middle of a save operation
      
      const hasChanges = perCellHasUnsavedChanges;
      const isTyping = isTypingActive();
      const isSavingNow = saveInProgressRef.current || isSaving;
      
      if (hasChanges && !isTyping && !isSavingNow) {
        console.log('⏰ PARANOID SAVE: Forcing save for unsaved changes (30s timer)');
        
        // Per-cell mode: use coordinated save
        saveCoordinatedState(state).catch(error => {
          // "No changes to save" means flags were already synced - not an error
          if (error.message === 'No changes to save') {
            console.log('⏰ PARANOID SAVE: Already saved - flags were stale');
          } else {
            console.error('⏰ PARANOID SAVE: Save failed:', error);
          }
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(paranoidSaveInterval);
  }, [
    rundownId, 
    isInitiallyLoaded, 
    perCellHasUnsavedChanges,
    isTypingActive, 
    isSaving,
    saveCoordinatedState,
    state
  ]);

  // REMOVED: Save-on-unmount logic
  // Prevents overwriting newer data with stale state on tab close
  // Users should manually save or rely on auto-save during active editing
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (postTypingSafetyTimeoutRef.current) {
        clearTimeout(postTypingSafetyTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    };
  }, []);

  // Note: Cell update coordination now handled via React context instead of global variables

  return {
    trackFieldChange,
    handleStructuralOperation,
    isSaving: !isBootstrapping && isSaving, // Don't show spinner during bootstrap
    hasUnsavedChanges: isPerCellEnabled ? perCellHasUnsavedChanges : (hasUnsavedChangesRef.current || hasCoordinatedUnsavedChanges()), // Use reactive state for per-cell
    setUndoActive,
    markActiveTyping,
    isTypingActive,
    triggerImmediateSave: () => performSave(true), // For immediate saves without typing delay
    retryFailedSaves,
    getFailedSavesCount,
    updateBaselineFromServerData, // SINGLE POINT: Call after any server data load
    // Expose journal functions for debugging
    getJournalStats: keystrokeJournal.getJournalStats,
    setVerboseLogging: keystrokeJournal.setVerboseLogging,
    clearJournal: keystrokeJournal.clearJournal
  };
};
