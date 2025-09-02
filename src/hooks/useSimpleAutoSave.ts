import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void,
  pendingStructuralChangeRef?: React.MutableRefObject<boolean>,
  suppressUntilRef?: React.MutableRefObject<number>,
  isInitiallyLoaded?: boolean
) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);
  const saveQueueRef = useRef<{ signature: string; retryCount: number } | null>(null);
  const currentSaveSignatureRef = useRef<string>('');
  
  // Typing idle detection
  const lastEditAtRef = useRef<number>(0);
  const typingIdleMs = 3000; // Wait 3s after last edit before allowing saves

  // Stable onSaved ref to avoid effect churn from changing callbacks
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // Create content signature that ONLY includes actual content (NO showcaller fields at all)
  const createContentSignature = useCallback(() => {
    // Create signature with ONLY content fields - completely exclude ALL showcaller data
    const cleanItems = state.items?.map((item: any) => {
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
      title: state.title || '',
      startTime: state.startTime || '',
      timezone: state.timezone || ''
    });
    
    console.log('🔍 Creating signature with', cleanItems.length, 'items');
    return signature;
  }, [state.items, state.title, state.startTime, state.timezone]);

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
    }
  }, [rundownId]);

  useEffect(() => {
    if (!isInitiallyLoaded) return;

    // Prime baseline once per rundown when initial load completes
    if (rundownId !== lastPrimedRundownRef.current) {
      const sig = createContentSignature();
      lastSavedRef.current = sig;
      lastPrimedRundownRef.current = rundownId;
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

  // Function to mark active typing - called by input components
  const markActiveTyping = useCallback(() => {
    lastEditAtRef.current = Date.now();
    console.log('⌨️ AutoSave: typing activity recorded');
  }, []);

  // Check if user is currently typing
  const isTypingActive = useCallback(() => {
    return Date.now() - lastEditAtRef.current < typingIdleMs;
  }, [typingIdleMs]);

  // Enhanced save function with re-queuing logic
  const performSave = useCallback(async (): Promise<void> => {
    // CRITICAL: Gate autosave until initial load is complete
    if (!isInitiallyLoaded) {
      debugLogger.autosave('Save blocked: initial load not complete');
      console.log('🛑 AutoSave: blocked - initial load not complete');
      return;
    }

    // Check suppression cooldown to prevent ping-pong
    if (suppressUntilRef?.current && suppressUntilRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: teammate update cooldown active');
      console.log('🛑 AutoSave: blocked - teammate update cooldown active');
      return;
    }
    
    // Check if user is currently typing - defer save if so
    if (isTypingActive()) {
      debugLogger.autosave('Save deferred: user is actively typing');
      console.log('⌨️ AutoSave: deferred - user is actively typing, rescheduling');
      setTimeout(() => {
        if (!isTypingActive()) {
          performSave();
        }
      }, typingIdleMs);
      return;
    }
    
    // Final check before saving - only undo blocks saves  
    if (isSaving || undoActiveRef.current) {
      debugLogger.autosave('Save blocked: already saving or undo active');
      console.log('🛑 AutoSave: blocked - already saving or undo active');
      return;
    }
    
    // Final signature check
    const finalSignature = createContentSignature();

    // ANTI-WIPE CIRCUIT BREAKER: Prevent saves that would drastically reduce items
    const currentItemCount = state.items?.length || 0;
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
    
    setIsSaving(true);
    currentSaveSignatureRef.current = finalSignature;
    
    try {
      // Track this as our own update before saving
      const updateTimestamp = new Date().toISOString();
      trackMyUpdate(updateTimestamp);

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
            title: state.title,
            items: state.items,
            start_time: state.startTime,
            timezone: state.timezone,
            team_id: teamData.team_id,
            user_id: currentUserId,
            folder_id: folderId,
            updated_at: updateTimestamp,
            last_updated_by: currentUserId
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
          lastSavedRef.current = finalSignature;
          console.log('📝 Setting lastSavedRef after NEW rundown save:', finalSignature.length);
          onSavedRef.current?.();
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        // Enhanced update for existing rundowns with user tracking
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        console.log('💾 AutoSave: updating rundown', { rundownId, items: state.items?.length, title: state.title });
        const { data, error } = await supabase
          .from('rundowns')
          .update({
            title: state.title,
            items: state.items,
            start_time: state.startTime,
            timezone: state.timezone,
            updated_at: new Date().toISOString(),
            last_updated_by: currentUserId
          })
          .eq('id', rundownId)
          .select('updated_at')
          .single();
        console.log('✅ AutoSave: update response', { ok: !error, updated_at: data?.updated_at });

        if (error) {
          console.error('❌ Save failed:', error);
          toast({
            title: "Save failed",
            description: "Unable to save changes. Will retry automatically.",
            variant: "destructive",
            duration: 3000,
          });
        } else {
          // Track the actual timestamp returned by the database
          if (data?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(data.updated_at);
            trackMyUpdate(normalizedTimestamp);
            // Register this save to prevent false positives in resumption
            registerRecentSave(rundownId, normalizedTimestamp);
          }
          lastSavedRef.current = finalSignature;
          console.log('📝 Setting lastSavedRef after UPDATE rundown save:', finalSignature.length);
          onSavedRef.current?.();
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
      
      // Clear structural change flag after save completes
      if (pendingStructuralChangeRef) {
        pendingStructuralChangeRef.current = false;
      }
      
      // Check if content changed during save - if so, re-queue
      const currentSignature = createContentSignature();
      if (currentSignature !== currentSaveSignatureRef.current && currentSignature !== lastSavedRef.current) {
        saveQueueRef.current = { 
          signature: currentSignature, 
          retryCount: (saveQueueRef.current?.retryCount || 0) + 1 
        };
        
        // Re-trigger save with short delay, but max 3 retries to prevent infinite loops
        if ((saveQueueRef.current?.retryCount || 0) < 3) {
          setTimeout(() => {
            if (saveQueueRef.current && !isSaving && !isTypingActive()) {
              saveQueueRef.current = null;
              performSave();
            }
          }, typingIdleMs);
        } else {
          saveQueueRef.current = null;
        }
      } else {
        // Clear queue if no more changes
        saveQueueRef.current = null;
      }
    }
  }, [rundownId, createContentSignature, navigate, trackMyUpdate, location.state, toast, state.title, state.items, state.startTime, state.timezone, isSaving, suppressUntilRef]);

  // Keep latest performSave reference without retriggering effects
  const performSaveRef = useRef(performSave);
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
    const debounceTime = isStructuralChange ? 100 : (state.hasUnsavedChanges ? 2500 : 500);
    console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges });

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
      console.log('🛑 AutoSave(effect): blocked - teammate update cooldown active');
      return;
    }
    
    if (undoActiveRef.current) {
      console.log('🛑 AutoSave(effect): blocked - undo operation active');
      return;
    }

    if (state.hasUnsavedChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const isStructuralChange = pendingStructuralChangeRef?.current || false;
      const baseDebounce = isStructuralChange ? 100 : 2500;
      const debounceTime = isTypingActive() ? Math.max(baseDebounce, typingIdleMs) : baseDebounce;
      console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges, typingActive: isTypingActive() });

      saveTimeoutRef.current = setTimeout(async () => {
        // Double-check typing state right before saving
        if (isTypingActive()) {
          console.log('⌨️ AutoSave(effect): deferred at trigger - user is typing, rescheduling');
          // Re-schedule to try again after typing idle window
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(async () => {
            console.log('⏱️ AutoSave: executing save now (post-typing)');
            try {
              await performSaveRef.current();
              console.log('✅ AutoSave: save completed successfully');
            } catch (error) {
              console.error('❌ AutoSave: save execution failed:', error);
            }
          }, typingIdleMs);
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
    };
  }, [state.hasUnsavedChanges, isInitiallyLoaded, rundownId, suppressUntilRef]);

  // Flush any pending changes on unmount/view switch to prevent reverts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (isLoadedRef.current && hasUnsavedRef.current && rundownIdRef.current !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing pending changes on unmount');
        try {
          // Fire-and-forget; ensures a network request is sent before teardown
          performSaveRef.current();
        } catch (e) {
          console.error('❌ AutoSave: flush-on-unmount failed', e);
        }
      }
    };
  }, []);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    markActiveTyping
  };
};