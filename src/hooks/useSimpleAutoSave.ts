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
import { createUnifiedContentSignature, createLightweightContentSignature } from '@/utils/contentSignature';
import { useKeystrokeJournal } from './useKeystrokeJournal';
import { useFieldDeltaSave } from './useFieldDeltaSave';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';
import { getTabId } from '@/utils/tabUtils';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: (meta?: { updatedAt?: string; docVersion?: number }) => void,
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
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const saveQueueRef = useRef<{ signature: string; retryCount: number } | null>(null);
  const currentSaveSignatureRef = useRef<string>('');
  const editBaseDocVersionRef = useRef<number>(0);
  
  // Enhanced cooldown management with explicit flags (passed as parameters)
  // Simplified autosave system - reduce complexity with performance optimization
  const lastEditAtRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  
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
  const initialLoadCooldownRef = useRef<number>(0); // blocks saves right after initial load
  
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
  const createContentSignature = useCallback(() => {
    const signature = createContentSignatureFromState(state);
    
    // Debug signature generation when we have unsaved changes
    if (state.hasUnsavedChanges && lastSavedRef.current && signature === lastSavedRef.current) {
      console.warn('🔍 SIGNATURE DEBUG: Generated signature matches saved but hasUnsavedChanges=true', {
        itemCount: state.items?.length || 0,
        titleLength: (state.title || '').length,
        hasUnsavedChanges: state.hasUnsavedChanges,
        sigLength: signature.length,
        lastSavedLength: lastSavedRef.current.length,
        firstDiff: signature.substring(0, 200) !== lastSavedRef.current.substring(0, 200) ? 'content differs' : 'content identical'
      });
    }
    
    return signature;
  }, [state]);

  // Set initial load cooldown to prevent false attribution
  useEffect(() => {
    if (isInitiallyLoaded) {
      // Prevent saves for 3 seconds after initial load to avoid false attribution
      initialLoadCooldownRef.current = Date.now() + 3000;
    }
  }, [isInitiallyLoaded]);

  // Performance-optimized signature cache to avoid repeated JSON.stringify calls
  const signatureCache = useRef<Map<string, { signature: string; timestamp: number }>>(new Map());
  const SIGNATURE_CACHE_TTL = 1000; // FIXED: Reduced from 5000ms to 1000ms for better edit responsiveness
  
  // Memory cleanup for large rundowns to prevent memory leaks
  useEffect(() => {
    const itemCount = state.items?.length || 0;
    if (itemCount > 150) {
      const interval = setInterval(() => {
        // Clear old cache entries to prevent memory accumulation
        const now = Date.now();
        for (const [key, value] of signatureCache.current.entries()) {
          if (now - value.timestamp > SIGNATURE_CACHE_TTL) {
            signatureCache.current.delete(key);
          }
        }
        
        // Force garbage collection hint for very large rundowns
        if (itemCount > 200 && signatureCache.current.size > 100) {
          signatureCache.current.clear();
          console.log('🧹 AutoSave: Cleared signature cache for memory optimization');
        }
      }, 10000); // Clean every 10 seconds for large rundowns
      
      return () => clearInterval(interval);
    }
  }, [state.items?.length]);

  // Create content signature from any state (for use with snapshots) with caching
  const createContentSignatureFromState = useCallback((targetState: RundownState) => {
    const itemCount = targetState.items?.length || 0;
    
    // FIXED: Create a more comprehensive cache key that includes actual content changes
    const contentHash = targetState.items?.map(item => 
      // Include all text fields that users can edit
      `${item.id}:${item.name || ''}:${item.talent || ''}:${item.script || ''}:${item.gfx || ''}:${item.video || ''}:${item.images || ''}:${item.notes || ''}:${item.duration || ''}:${item.color || ''}`
    ).join('|') || '';
    
    const cacheKey = JSON.stringify({
      itemIds: targetState.items?.map(item => item.id) || [],
      itemCount,
      title: targetState.title || '',
      startTime: targetState.startTime || '',
      contentHash: contentHash.length > 1000 ? 
        // For very long content, use a simple hash to avoid huge cache keys
        contentHash.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) 
        : contentHash,
      externalNotes: targetState.externalNotes || '',
      timezone: targetState.timezone || ''
    });
    
    // Check cache first for performance
    const cached = signatureCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SIGNATURE_CACHE_TTL) {
      debugLogger.autosave(`Using cached signature for ${itemCount} items`);
      return cached.signature;
    }
    
    // Performance optimization for very large rundowns - use lightweight signature
    if (itemCount > 200) {
      const lightweightSignature = createLightweightContentSignature({
        items: targetState.items || [],
        title: targetState.title || '',
        columns: [], // Not available in RundownState, but not needed for lightweight
        timezone: targetState.timezone || '',
        startTime: targetState.startTime || '',
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
    
    // Standard signature for smaller rundowns - use unified function
    const signature = createUnifiedContentSignature({
      items: targetState.items || [],
      title: targetState.title || '',
      columns: [], // Not available in RundownState, will be empty array
      timezone: targetState.timezone || '',
      startTime: targetState.startTime || '',
      showDate: targetState.showDate || null,
      externalNotes: targetState.externalNotes || ''
    });
    
    // Cache the result
    signatureCache.current.set(cacheKey, {
      signature,
      timestamp: Date.now()
    });
    
    debugLogger.autosave(`Created full signature with ${itemCount} items`);
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
      const currentSignature = createContentSignature();
      lastSavedRef.current = currentSignature;
      lastPrimedRundownRef.current = rundownId;
      
      // Initialize field delta system
      initializeSavedState(state);
      
      // Clear bootstrapping flag to prevent spinner flicker
      setIsBootstrapping(false);
      
      // Log if there's a mismatch for debugging
      if (state.hasUnsavedChanges) {
        console.log('🔍 AutoSave: baseline primed with hasUnsavedChanges=true - signatures should now be consistent');
      }
      
      console.log('✅ AutoSave: primed baseline for rundown', { 
        rundownId, 
        instanceId: currentInstance,
        baselineLength: currentSignature.length,
        needsBaseline,
        hadUnsavedChanges: state.hasUnsavedChanges
      });
    }
  }, [isInitiallyLoaded, rundownId, createContentSignature]);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('🎯 Undo active set to:', active);
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

  // Field-level delta saving for collaborative editing (after trackMyUpdate is defined)
  const { saveDeltaState, initializeSavedState, trackFieldChange } = useFieldDeltaSave(
    rundownId,
    trackMyUpdate
  );

  // Enhanced typing tracker with immediate save cancellation and proper timeout management
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const userTypingRef = useRef(false);
  
  const markActiveTyping = useCallback(() => {
    const now = Date.now();
    lastEditAtRef.current = now;
    recentKeystrokes.current = now;
    userTypingRef.current = true; // Set user typing flag
    microResaveAttemptsRef.current = 0; // Reset circuit breaker on new typing
    
    // CRITICAL: Set hasUnsavedChangesRef for consistency
    hasUnsavedChangesRef.current = true;
    
    // CRITICAL: Clear initial load cooldown on actual typing - user is making real edits
    if (initialLoadCooldownRef.current > now) {
      initialLoadCooldownRef.current = 0;
    }
    
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
      console.log('⌨️ Typing timeout - clearing typing state');
      userTypingRef.current = false;
      typingTimeoutRef.current = undefined;
      
      // If there are still unsaved changes, schedule a save
      if (hasUnsavedChangesRef.current && !saveInProgressRef.current) {
        console.log('💾 Typing timeout: scheduling delayed save for remaining changes');
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
      console.log('💾 Save timeout reached - clearing typing state and saving');
      userTypingRef.current = false; // Clear typing flag before save
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      performSave(false, isSharedView);
    }, typingIdleMs);
    
    // Max-delay forced save only if user keeps typing continuously
    maxDelayTimeoutRef.current = setTimeout(() => {
      console.log('⏲️ AutoSave: max delay reached - forcing save');
      console.log('💾 Max delay reached - clearing typing state and forcing save');
      userTypingRef.current = false; // Clear typing flag before save
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      performSave(true, isSharedView);
      maxDelayTimeoutRef.current = null;
    }, maxSaveDelay);
  }, [typingIdleMs, keystrokeJournal, blockUntilLocalEditRef, isSaving]);

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

  // Micro-resave with consistent behavior across all rundown sizes
  const scheduleMicroResave = useCallback(() => {
    const currentSignature = createContentSignature();
    
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

    // CRITICAL: Prevent saves during initial load period to avoid false attribution
    if (initialLoadCooldownRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: initial load cooldown active');
      console.log('🛑 AutoSave: blocked - initial load cooldown active');
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

    // REFINED STALE TAB PROTECTION: Allow saves for second monitor scenarios
    // Only block saves if tab has been hidden/unfocused for extended periods (indicating sleep/inactivity)
    // OR if no recent activity and wasn't initiated while active
    const isTabCurrentlyInactive = document.hidden || !document.hasFocus();
    const hasRecentKeystrokes = Date.now() - recentKeystrokes.current < 5000;
    const hasBeenInactiveForLong = isTabCurrentlyInactive && Date.now() - lastEditAtRef.current > 30000; // 30 seconds
    
    // Skip tab inactivity checks for shared views since users often view them in background tabs
    if (!isSharedView) {
      if (!isFlushSave && hasBeenInactiveForLong && !saveInitiatedWhileActiveRef.current && !hasRecentKeystrokes) {
        debugLogger.autosave('Save blocked: tab inactive for extended period');
        console.log('🛑 AutoSave: blocked - tab inactive for extended period');
        return;
      }
      
      if (hasRecentKeystrokes && isTabCurrentlyInactive) {
        console.log('✅ AutoSave: allowing save despite hidden tab due to recent keystrokes');
      }
    }
    
    if (isFlushSave && isTabCurrentlyInactive) {
      console.log('🧯 AutoSave: flush save proceeding despite tab inactive - preserving keystrokes');
    }
    
    if (!isFlushSave && isTabCurrentlyInactive && saveInitiatedWhileActiveRef.current) {
      console.log('✅ AutoSave: tab hidden but save was initiated while active - proceeding');
    }

    // CRITICAL: Block if explicitly flagged to wait for local edit
    if (blockUntilLocalEditRef && blockUntilLocalEditRef.current) {
      debugLogger.autosave('Save blocked: waiting for local edit after remote update');
      console.log('🛑 AutoSave: blocked - waiting for local edit after remote update');
      return;
    }
    
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
    
  // RELAXED SAVE POLICY: For collaborative editing, be more aggressive about saving
  // Only skip save if we're certain there are no changes AND no unsaved changes flag
  if (finalSignature === lastSavedRef.current && !state.hasUnsavedChanges && lastSavedRef.current.length > 0) {
    debugLogger.autosave('No changes to save - marking as saved');
    console.log('ℹ️ AutoSave: no content changes detected - signatures match and no unsaved changes');
    console.log('🔍 Debug: Current signature length:', finalSignature.length, 'Last saved length:', lastSavedRef.current.length);
    onSavedRef.current?.();
    return;
  }
  
  // For collaborative environments, if there's ANY doubt, save the data
  if (state.hasUnsavedChanges || lastSavedRef.current.length === 0) {
    console.log('💾 AutoSave: Proceeding with save - hasUnsavedChanges=' + state.hasUnsavedChanges + ', isFirstSave=' + (lastSavedRef.current.length === 0));
  }
    
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
          // Track the actual timestamp returned by the database
          if (newRundown?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(newRundown.updated_at);
            trackMyUpdate(normalizedTimestamp);
            // Register this save to prevent false positives in resumption
            registerRecentSave(newRundown.id, normalizedTimestamp);
          }
          // Update lastSavedRef immediately to prevent retry race condition
          lastSavedRef.current = finalSignature;
          console.log('📝 Setting lastSavedRef immediately after NEW rundown save:', finalSignature.length);
          
          // Update lastSavedRef to current state signature after successful save
          const currentSignatureAfterSave = createContentSignature();
          lastSavedRef.current = currentSignatureAfterSave;
          console.log('📝 Setting lastSavedRef to current state after full save:', currentSignatureAfterSave.length);

          // SIMPLIFIED: No complex follow-up logic - typing detection handles new saves
          if (currentSignatureAfterSave !== finalSignature) {
            console.log('⚠️ Content changed during save - will be caught by next typing cycle');
          }
          onSavedRef.current?.({ updatedAt: newRundown?.updated_at ? normalizeTimestamp(newRundown.updated_at) : undefined, docVersion: (newRundown as any)?.doc_version });
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        console.log('⚡ AutoSave: using delta save for rundown', { 
          rundownId, 
          itemCount: saveState.items?.length || 0,
          isFlushSave 
        });
        
        try {
          // Use field-level delta save
          const { updatedAt, docVersion } = await saveDeltaState(saveState);
          
          console.log('✅ AutoSave: delta save response', { 
            updatedAt,
            docVersion 
          });

          // Track the actual timestamp returned by the database
          if (updatedAt) {
            const normalizedTs = normalizeTimestamp(updatedAt);
            trackMyUpdate(normalizedTs);
            if (rundownId) {
              registerRecentSave(rundownId, normalizedTs);
            }
          }

          // Update lastSavedRef to current state signature after successful save
          const currentSignatureAfterSave = createContentSignature();
          lastSavedRef.current = currentSignatureAfterSave;
          console.log('📝 Setting lastSavedRef to current state after delta save:', currentSignatureAfterSave.length);

          // SIMPLIFIED: No complex follow-up logic - typing detection handles new saves
          if (currentSignatureAfterSave !== finalSignature) {
            console.log('⚠️ Content changed during save - will be caught by next typing cycle');
          }

          // Invoke callback with metadata
          onSavedRef.current?.({ 
            updatedAt, 
            docVersion 
          });
        } catch (deltaError: any) {
          // If delta save fails due to no changes, that's OK
          if (deltaError?.message === 'No changes to save') {
            console.log('ℹ️ Delta save: no changes detected');
            onSavedRef.current?.();
          } else {
            throw deltaError;
          }
        }
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      toast({
        title: "Save failed",
        description: "Unable to save changes. Will retry automatically.",
        variant: "destructive",
        duration: 3000,
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
            console.log('⏲️ AutoSave: max delay reached post-save - forcing save');
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
      const currentSignature = createContentSignature();
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
  }, [rundownId, createContentSignature, navigate, trackMyUpdate, location.state, toast, state.title, state.items, state.startTime, state.timezone, isSaving, suppressUntilRef]);

  // Keep latest performSave reference without retriggering effects
  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Track latest flags for unmount flush and state tracking
  const hasUnsavedRef = useRef(false);
  useEffect(() => { 
    hasUnsavedRef.current = state.hasUnsavedChanges;
    hasUnsavedChangesRef.current = state.hasUnsavedChanges;
  }, [state.hasUnsavedChanges]);
  const isLoadedRef = useRef(!!isInitiallyLoaded);
  useEffect(() => { isLoadedRef.current = !!isInitiallyLoaded; }, [isInitiallyLoaded]);
  const rundownIdRef = useRef(rundownId);
  useEffect(() => { rundownIdRef.current = rundownId; }, [rundownId]);

  // Debounced save function that's called by state change handlers, not useEffect
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const currentSignature = createContentSignature();
    
    if (currentSignature === lastSavedRef.current) {
      if (state.hasUnsavedChanges) {
        console.log('⚠️ AutoSave: hasUnsavedChanges=true but signatures match - this indicates change tracking mismatch');
        console.log('🔍 Debug: Current signature length:', currentSignature.length, 'Last saved length:', lastSavedRef.current.length);
        console.log('🔍 Debug: Signatures equal:', currentSignature === lastSavedRef.current);
        onSavedRef.current?.();
      }
      return;
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
      // CRITICAL: Skip AutoSave if cell broadcast is being applied
      if (applyingCellBroadcastRef?.current) {
        console.log('📱 AutoSave: skipped - cell broadcast being applied');
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

  // Enhanced flush-on-blur/visibility-hidden to guarantee keystroke saving
  useEffect(() => {
    const handleFlushOnBlur = async () => {
      if (state.hasUnsavedChanges && rundownId && rundownId !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing on tab blur/hidden to preserve keystrokes');
        try {
          await performSave(true, isSharedView); // Pass true to indicate this is a flush save
        } catch (error) {
          console.error('❌ AutoSave: flush-on-blur failed:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFlushOnBlur();
      }
    };

    const handleWindowBlur = () => {
      handleFlushOnBlur();
    };

    // Add comprehensive flush triggers
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleFlushOnBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleFlushOnBlur);
    };
  }, [state.hasUnsavedChanges, rundownId, performSave]);

  // Flush any pending changes on unmount/view switch to prevent reverts
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
      if (isLoadedRef.current && hasUnsavedRef.current && rundownIdRef.current !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing pending changes on unmount');
        try {
          // Fire-and-forget flush save that bypasses tab-hidden checks
          performSaveRef.current(true);
        } catch (e) {
          console.error('❌ AutoSave: flush-on-unmount failed', e);
        }
      }
    };
  }, []);

  // Note: Cell update coordination now handled via React context instead of global variables

  return {
    isSaving: !isBootstrapping && isSaving, // Don't show spinner during bootstrap
    setUndoActive,
    setTrackOwnUpdate,
    markActiveTyping,
    isTypingActive,
    triggerImmediateSave: () => performSave(true), // For immediate saves without typing delay
    // Expose journal functions for debugging
    getJournalStats: keystrokeJournal.getJournalStats,
    setVerboseLogging: keystrokeJournal.setVerboseLogging,
    clearJournal: keystrokeJournal.clearJournal
  };
};
