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
  cooldownUntilRef?: React.MutableRefObject<number>
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { shouldBlockAutoSave } = useCellUpdateCoordination();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const saveQueueRef = useRef<{ signature: string; retryCount: number } | null>(null);
  const currentSaveSignatureRef = useRef<string>('');
  const editBaseDocVersionRef = useRef<number>(0);
  
  // Enhanced cooldown management with explicit flags (passed as parameters)
  // Simplified autosave system - reduce complexity
  const lastEditAtRef = useRef<number>(0);
  const typingIdleMs = 1500; // Shorter, more responsive timing
  const maxSaveDelay = 5000; // Reduced max delay for faster saves
  const microResaveMs = 200; // Faster micro-resave
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
  
  // Keystroke journal for reliable content tracking
  const keystrokeJournal = useKeystrokeJournal({
    rundownId,
    state,
    enabled: true
  });

  // Stable onSaved ref to avoid effect churn from changing callbacks
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // Create content signature from current state (backwards compatibility)
  const createContentSignature = useCallback(() => {
    return createContentSignatureFromState(state);
  }, [state]);

  // Create content signature from any state (for use with snapshots)
  const createContentSignatureFromState = useCallback((targetState: RundownState) => {
    // Create signature with ONLY content fields - completely exclude ALL showcaller data
    const cleanItems = targetState.items?.map((item: any) => {
      // Create a clean copy with only the editable content fields
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
    
    console.log('🔍 Creating signature with', cleanItems.length, 'items');
    return signature;
  }, []);

  // Stabilized baseline priming - only reset on actual rundown switches, not during init
  const lastPrimedRundownRef = useRef<string | null>(null);
  
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

    // Prime baseline once per rundown when initial load completes
    if (rundownId !== lastPrimedRundownRef.current) {
      const sig = createContentSignature();
      lastSavedRef.current = sig;
      lastPrimedRundownRef.current = rundownId;
      
      // Initialize field delta system
      initializeSavedState(state);
      
      console.log('✅ AutoSave: primed baseline for rundown', { 
        rundownId, 
        length: sig.length 
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

  // Simplified typing activity tracker - single save mechanism
  const markActiveTyping = useCallback(() => {
    const now = Date.now();
    lastEditAtRef.current = now;
    recentKeystrokes.current = now;
    microResaveAttemptsRef.current = 0; // Reset circuit breaker on new typing
    
    // CRITICAL: Clear blockUntilLocalEditRef on any typing
    if (blockUntilLocalEditRef && blockUntilLocalEditRef.current) {
      console.log('⌨️ Local typing detected - clearing blockUntilLocalEditRef');
      blockUntilLocalEditRef.current = false;
    }
    
    console.log('⌨️ AutoSave: typing activity recorded - rescheduling save');
    
    // Record typing in journal for debugging and recovery (but don't trigger snapshot update)
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
    
    // Schedule single save after idle period
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ AutoSave: idle timeout reached - triggering save');
      performSave();
    }, typingIdleMs);
    
    // Max-delay forced save only if user keeps typing continuously
    maxDelayTimeoutRef.current = setTimeout(() => {
      console.log('⏲️ AutoSave: max delay reached - forcing save');
      performSave(true);
      maxDelayTimeoutRef.current = null;
    }, maxSaveDelay);
  }, [typingIdleMs, keystrokeJournal, blockUntilLocalEditRef]);

  // Check if user is currently typing
  const isTypingActive = useCallback(() => {
    return Date.now() - lastEditAtRef.current < typingIdleMs;
  }, [typingIdleMs]);

  // Circuit-breaker protected micro-resave to prevent loops
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
    
    // Circuit breaker: prevent infinite loops (reduced threshold)
    if (microResaveAttemptsRef.current >= 1) {
      console.warn('🧯 Micro-resave: circuit breaker activated - max attempts reached');
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

  // Enhanced save function with conflict prevention
  const performSave = useCallback(async (isFlushSave = false): Promise<void> => {
    // CRITICAL: Gate autosave until initial load is complete
    if (!isInitiallyLoaded) {
      debugLogger.autosave('Save blocked: initial load not complete');
      console.log('🛑 AutoSave: blocked - initial load not complete');
      return;
    }

    // CRITICAL: Use coordinated blocking to prevent cross-saving and showcaller conflicts
    if (shouldBlockAutoSave()) {
      // Schedule retry if blocked by showcaller operation (short-term block)
      if (!saveTimeoutRef.current) {
        saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = undefined;
          performSave(isFlushSave);
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
    
    if (!isFlushSave && hasBeenInactiveForLong && !saveInitiatedWhileActiveRef.current && !hasRecentKeystrokes) {
      debugLogger.autosave('Save blocked: tab inactive for extended period');
      console.log('🛑 AutoSave: blocked - tab inactive for extended period');
      return;
    }
    
    if (hasRecentKeystrokes && isTabCurrentlyInactive) {
      console.log('✅ AutoSave: allowing save despite hidden tab due to recent keystrokes');
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
    
    // Enhanced typing protection with force-save after max delay
    const timeSinceLastEdit = Date.now() - lastEditAtRef.current;
    const isRecentlyTyping = timeSinceLastEdit < typingIdleMs;
    const hasExceededMaxDelay = timeSinceLastEdit > maxSaveDelay;
    
    if (isRecentlyTyping && !hasExceededMaxDelay) {
      debugLogger.autosave('Save deferred: user actively typing');
      console.log('⌨️ AutoSave: user still typing, waiting for idle period');
      return; // Don't reschedule here - markActiveTyping handles it
    }
    
    if (hasExceededMaxDelay && isRecentlyTyping) {
      console.log('⚡ AutoSave: forcing save after max delay despite typing');
    }
    
    // Final check before saving - prevent overlapping saves
    if (saveInProgressRef.current || undoActiveRef.current) {
      debugLogger.autosave('Save blocked: already saving or undo active');
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      
      // Ensure a follow-up save runs right after the current one finishes
      if (saveInProgressRef.current) {
        pendingFollowUpSaveRef.current = true;
        console.log('🕒 AutoSave: follow-up save scheduled after in-progress save');
      }
      return;
    }
    
    // Build save payload from latest snapshot for consistency
    const latestSnapshot = keystrokeJournal.getLatestSnapshot();
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
    
    if (finalSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      debugLogger.autosave('No changes to save - marking as saved');
      console.log('ℹ️ AutoSave: no content changes detected');
      onSavedRef.current?.();
      return;
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
        const { data: newRundown, error: createError } = await supabase
          .from('rundowns')
          .insert({
            title: saveState.title,
            items: saveState.items,
            start_time: saveState.startTime,
            timezone: saveState.timezone,
            show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
            external_notes: saveState.externalNotes,
            team_id: teamData.team_id,
            user_id: currentUserId,
            folder_id: folderId,
            last_updated_by: currentUserId,
            tab_id: getTabId()
          })
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
          
          // Delay signature comparison longer to avoid React state race conditions and double saves
          setTimeout(() => {
            const currentSignatureAfterSave = createContentSignature();
            if (currentSignatureAfterSave !== finalSignature) {
              // Be more conservative about micro-resaves - only trigger if significant time has passed
              const timeSinceLastEdit = Date.now() - lastEditAtRef.current;
              if (timeSinceLastEdit > (typingIdleMs * 2)) {
                console.log('⚠️ Content changed during save - scheduling micro-resave');
                lastSavedRef.current = currentSignatureAfterSave; // Update to latest
                scheduleMicroResave();
              } else {
                console.log('ℹ️ Content changed during save but recent activity - updating lastSaved to latest');
                lastSavedRef.current = currentSignatureAfterSave;
              }
            }
          }, 500); // Increased delay to let React state settle completely
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

          // Update lastSavedRef immediately to prevent retry race condition  
          lastSavedRef.current = finalSignature;
          console.log('📝 Setting lastSavedRef immediately after delta save:', finalSignature.length);

          // Delay signature comparison longer to avoid React state race conditions and double saves
          setTimeout(() => {
            const currentSignatureAfterSave = createContentSignature();
            if (currentSignatureAfterSave !== finalSignature) {
              const timeSinceLastEdit = Date.now() - lastEditAtRef.current;
              if (timeSinceLastEdit > (typingIdleMs * 2)) {
                console.log('⚠️ Content changed during save - scheduling micro-resave');
                lastSavedRef.current = currentSignatureAfterSave; // Update to latest
                scheduleMicroResave();
              } else {
                console.log('ℹ️ Content changed during save but recent activity - updating lastSaved to latest');
                lastSavedRef.current = currentSignatureAfterSave;
              }
            }
          }, 500);

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
      
      // If a save request came in during the in-progress save, run it now
      if (pendingFollowUpSaveRef.current) {
        pendingFollowUpSaveRef.current = false;
        console.log('🔁 AutoSave: executing pending follow-up save');
        setTimeout(() => {
          try {
            performSaveRef.current();
          } catch (e) {
            console.error('❌ AutoSave: pending follow-up save failed', e);
          }
        }, 0);
      }
      
      // Simplified retry logic - reduce complexity
      const currentSignature = createContentSignature();
      if (currentSignature !== currentSaveSignatureRef.current && currentSignature !== lastSavedRef.current) {
        const retryCount = (saveQueueRef.current?.retryCount || 0) + 1;
        
        // Simple retry with conservative backoff
        if (retryCount < 3) {
          console.log('🔄 AutoSave: queuing retry save in 400 ms (attempt', retryCount, ')');
          setTimeout(() => {
            if (!isSaving) {
              performSave();
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

  // Track latest flags for unmount flush
  const hasUnsavedRef = useRef(false);
  useEffect(() => { hasUnsavedRef.current = state.hasUnsavedChanges; }, [state.hasUnsavedChanges]);
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
        console.log('⚠️ AutoSave: hasUnsavedChanges=true but signatures match - marking saved anyway');
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
        await performSave();
        console.log('✅ AutoSave: save completed successfully');
      } catch (error) {
        console.error('❌ AutoSave: save execution failed:', error);
      }
    }, debounceTime);
  }, [createContentSignature, state.hasUnsavedChanges, performSave, pendingStructuralChangeRef]);

  // Simple effect that schedules a save when hasUnsavedChanges becomes true
  useEffect(() => {
    if (!isInitiallyLoaded) {
      console.log('🛑 AutoSave(effect): blocked - initial load not complete');
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
      // Record that this save is being initiated while tab is active
      saveInitiatedWhileActiveRef.current = !document.hidden && document.hasFocus();
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const isStructuralChange = pendingStructuralChangeRef?.current || false;
      const isMultiUserActive = suppressUntilRef?.current && suppressUntilRef.current > Date.now() - 1000;
      
      // Faster saves during multi-user activity
      const debounceTime = isStructuralChange ? 100 : (isMultiUserActive ? 300 : typingIdleMs);
      
      console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges, isMultiUserActive });

      saveTimeoutRef.current = setTimeout(async () => {
        // Reduced typing interference for better multi-user flow
        const timeSinceLastEdit = Date.now() - lastEditAtRef.current;
        if (isTypingActive() && timeSinceLastEdit < (isMultiUserActive ? 500 : maxSaveDelay)) {
          console.log('⌨️ AutoSave(effect): brief typing defer');
          // Brief reschedule but don't let it delay too long in multi-user scenarios
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(async () => {
            console.log('⏱️ AutoSave: executing save now (post-defer)');
            try {
              await performSaveRef.current();
              console.log('✅ AutoSave: save completed successfully');
            } catch (error) {
              console.error('❌ AutoSave: save execution failed:', error);
            }
          }, isMultiUserActive ? 200 : typingIdleMs);
          return;
        }

        console.log('⏱️ AutoSave: executing save now');
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
    };
  }, [state.hasUnsavedChanges, isInitiallyLoaded, rundownId, suppressUntilRef]);

  // Enhanced flush-on-blur/visibility-hidden to guarantee keystroke saving
  useEffect(() => {
    const handleFlushOnBlur = async () => {
      if (state.hasUnsavedChanges && rundownId && rundownId !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing on tab blur/hidden to preserve keystrokes');
        try {
          await performSave(true); // Pass true to indicate this is a flush save
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
    isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    markActiveTyping,
    isTypingActive,
    // Expose journal functions for debugging
    getJournalStats: keystrokeJournal.getJournalStats,
    setVerboseLogging: keystrokeJournal.setVerboseLogging,
    clearJournal: keystrokeJournal.clearJournal
  };
};
