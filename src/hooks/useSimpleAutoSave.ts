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

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: (meta?: { updatedAt?: string; docVersion?: number }) => void,
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
  const editBaseDocVersionRef = useRef<number>(0);
  
  // Enhanced idle-based autosave system
  const lastEditAtRef = useRef<number>(0);
  const typingIdleMs = 1200; // Wait 1.2s after typing stops
  const maxSaveDelay = 5000; // Maximum delay before forcing save
  const saveInProgressRef = useRef(false);
  const saveInitiatedWhileActiveRef = useRef(false);
  const microResaveTimeoutRef = useRef<NodeJS.Timeout>();
  const postTypingSafetyTimeoutRef = useRef<NodeJS.Timeout>();

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
      timezone: state.timezone || '',
      showDate: state.showDate ? `${state.showDate.getFullYear()}-${String(state.showDate.getMonth() + 1).padStart(2, '0')}-${String(state.showDate.getDate()).padStart(2, '0')}` : null,
      externalNotes: state.externalNotes || ''
    });
    
    console.log('🔍 Creating signature with', cleanItems.length, 'items');
    return signature;
  }, [state.items, state.title, state.startTime, state.timezone, state.showDate]);

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

  // Enhanced typing activity tracker with auto-rescheduling
  const markActiveTyping = useCallback(() => {
    lastEditAtRef.current = Date.now();
    console.log('⌨️ AutoSave: typing activity recorded - rescheduling save');
    
    // Record that this save will be initiated while tab is active
    saveInitiatedWhileActiveRef.current = !document.hidden && document.hasFocus();
    
    // Clear any existing safety save timeout when new typing occurs
    if (postTypingSafetyTimeoutRef.current) {
      clearTimeout(postTypingSafetyTimeoutRef.current);
    }
    
    // Always reschedule save when user types
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ AutoSave: idle timeout reached - triggering save');
      performSave();
      
      // Schedule safety save 2 seconds after typing stops
      postTypingSafetyTimeoutRef.current = setTimeout(() => {
        console.log('🛡️ AutoSave: post-typing safety save - capturing any missed content');
        performSave();
      }, 2000);
    }, typingIdleMs);
  }, [typingIdleMs]);

  // Check if user is currently typing
  const isTypingActive = useCallback(() => {
    return Date.now() - lastEditAtRef.current < typingIdleMs;
  }, [typingIdleMs]);

  // Schedule micro-resave for when content changes during save
  const scheduleMicroResave = useCallback(() => {
    if (microResaveTimeoutRef.current) {
      clearTimeout(microResaveTimeoutRef.current);
    }
    microResaveTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Micro-resave: capturing changes made during previous save');
      performSave();
    }, 200); // Quick 200ms resave to capture fast typing
  }, []);

  // Enhanced save function with conflict prevention
  const performSave = useCallback(async (): Promise<void> => {
    // CRITICAL: Gate autosave until initial load is complete
    if (!isInitiallyLoaded) {
      debugLogger.autosave('Save blocked: initial load not complete');
      console.log('🛑 AutoSave: blocked - initial load not complete');
      return;
    }

    // REFINED STALE TAB PROTECTION: Only block NEW saves, allow saves initiated while active
    const isTabCurrentlyInactive = document.hidden || !document.hasFocus();
    if (isTabCurrentlyInactive && !saveInitiatedWhileActiveRef.current) {
      debugLogger.autosave('Save blocked: tab hidden and save not initiated while active');
      console.log('🛑 AutoSave: blocked - tab hidden and save not initiated while active');
      return;
    }
    
    if (isTabCurrentlyInactive && saveInitiatedWhileActiveRef.current) {
      console.log('✅ AutoSave: tab hidden but save was initiated while active - proceeding');
    }

    // Check suppression cooldown to prevent ping-pong
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
    
    // Mark save in progress and capture what we're saving
    setIsSaving(true);
    saveInProgressRef.current = true;
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
            show_date: state.showDate ? `${state.showDate.getFullYear()}-${String(state.showDate.getMonth() + 1).padStart(2, '0')}-${String(state.showDate.getDate()).padStart(2, '0')}` : null,
            external_notes: state.externalNotes,
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
          // Only update saved reference if content hasn't changed during save
          const currentSignatureAfterSave = createContentSignature();
          if (currentSignatureAfterSave === finalSignature) {
            lastSavedRef.current = finalSignature;
            console.log('📝 Setting lastSavedRef after NEW rundown save:', finalSignature.length);
          } else {
            console.log('⚠️ Content changed during save - scheduling micro-resave');
            scheduleMicroResave();
          }
          onSavedRef.current?.({ updatedAt: newRundown?.updated_at ? normalizeTimestamp(newRundown.updated_at) : undefined, docVersion: (newRundown as any)?.doc_version });
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        // Enhanced update for existing rundowns with optimistic concurrency (doc_version)
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        console.log('💾 AutoSave: updating rundown', { rundownId, items: state.items?.length, title: state.title });

        // 1) Read current doc_version with retry logic
        let currentRow: any = null;
        let readErr: any = null;
        
        // Retry reading current version up to 3 times to handle race conditions
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { data, error } = await supabase
            .from('rundowns')
            .select('doc_version, updated_at')
            .eq('id', rundownId)
            .single();
            
          if (error) {
            readErr = error;
            console.warn(`❌ Attempt ${attempt} failed to read current doc_version:`, error);
            if (attempt < 3) {
              // Wait briefly before retry
              await new Promise(resolve => setTimeout(resolve, 100 * attempt));
              continue;
            }
          } else {
            currentRow = data;
            readErr = null;
            console.log(`✅ Read current doc_version on attempt ${attempt}:`, data?.doc_version);
            break;
          }
        }

        if (readErr || !currentRow) {
          console.error('❌ Save failed: could not read current doc_version after retries', readErr);
          throw readErr || new Error('Failed to read current rundown row');
        }

        const baseUpdate = {
          title: state.title,
          items: state.items,
          start_time: state.startTime,
          timezone: state.timezone,
          show_date: state.showDate ? `${state.showDate.getFullYear()}-${String(state.showDate.getMonth() + 1).padStart(2, '0')}-${String(state.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: state.externalNotes,
          updated_at: new Date().toISOString(),
          last_updated_by: currentUserId
        } as const;

        // 2) Attempt guarded update with current doc_version
        let { data: upd1, error: updErr1 } = await supabase
          .from('rundowns')
          .update(baseUpdate)
          .eq('id', rundownId)
          .eq('doc_version', currentRow.doc_version)
          .select('updated_at, doc_version');

        // If no rows updated or error, treat as conflict and retry once
        const noRowsUpdated = !upd1 || (Array.isArray(upd1) && upd1.length === 0);
        if (updErr1 || noRowsUpdated) {
          console.warn('⚠️ Version conflict detected. Retrying with latest doc_version...', { updErr1, noRowsUpdated });

          // Fetch latest version
          const { data: latestRow, error: latestErr } = await supabase
            .from('rundowns')
            .select('doc_version, updated_at')
            .eq('id', rundownId)
            .single();

          if (latestErr || !latestRow) {
            console.error('❌ Save failed: could not fetch latest doc_version after conflict', latestErr);
            throw latestErr || new Error('Failed to read latest rundown row');
          }

        // IMPROVED CONFLICT RESOLUTION: Merge instead of aborting
        const { data: latestRundown, error: fetchError } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (fetchError || !latestRundown) {
          console.error('❌ Save failed: could not fetch latest data for conflict resolution', fetchError);
          throw fetchError || new Error('Failed to fetch latest rundown data');
        }

        // Smart merge: combine our changes with remote changes instead of aborting
        console.log('🔄 Merging local changes with remote data for conflict resolution');
        
        // Create merged update that preserves both sets of changes
        const mergedItems = state.items?.map((localItem: any) => {
          const remoteItem = latestRundown.items?.find((item: any) => item.id === localItem.id);
          if (!remoteItem) return localItem; // New local item
          
          // Merge local and remote changes intelligently
          return {
            ...remoteItem, // Start with remote base
            ...localItem,  // Apply local changes on top
            // Preserve remote timestamps and system fields
            created_at: remoteItem.created_at,
            updated_at: remoteItem.updated_at
          };
        }) || [];
        
        // Add any new remote items that aren't in local state
        const localItemIds = new Set(state.items?.map(item => item.id) || []);
        const newRemoteItems = latestRundown.items?.filter((item: any) => !localItemIds.has(item.id)) || [];
        
        const finalMergedItems = [...mergedItems, ...newRemoteItems];
        
        // Update the base update with merged data
        Object.assign(baseUpdate, {
          items: finalMergedItems,
          // Preserve our local changes for non-item fields unless remote is newer
          title: state.title, // Keep our title change
          start_time: state.startTime, // Keep our timing change
          timezone: state.timezone, // Keep our timezone change
        });

        // Retry with merged data and latest doc_version
        let { data: upd2, error: updErr2 } = await supabase
          .from('rundowns')
          .update(baseUpdate)
          .eq('id', rundownId)
          .eq('doc_version', latestRundown.doc_version)
          .select('updated_at, doc_version');

        if (updErr2 || !upd2 || (Array.isArray(upd2) && upd2.length === 0)) {
          console.error('❌ Merged save failed - will retry once more', updErr2);
          
          // One final attempt with the very latest doc_version
          const { data: finalRow, error: finalErr } = await supabase
            .from('rundowns')
            .select('doc_version')
            .eq('id', rundownId)
            .single();
            
          if (!finalErr && finalRow) {
            const { data: upd3, error: updErr3 } = await supabase
              .from('rundowns')
              .update(baseUpdate)
              .eq('id', rundownId)
              .eq('doc_version', finalRow.doc_version)
              .select('updated_at, doc_version');
              
            if (updErr3 || !upd3 || (Array.isArray(upd3) && upd3.length === 0)) {
              console.error('❌ Final save attempt failed', updErr3);
              toast({
                title: 'Save failed',
                description: 'Changes could not be saved after multiple attempts. Your work is preserved locally.',
                variant: 'destructive',
                duration: 5000,
              });
              throw updErr3 || new Error('All save attempts failed');
            }
            
            // Use the final successful save
            upd2 = upd3;
            updErr2 = updErr3;
          } else {
            throw updErr2 || new Error('Conflict retry failed');
          }
        }

          const updated = Array.isArray(upd2) ? upd2[0] : upd2;
          console.log('✅ AutoSave: update (after conflict) response', { updated_at: updated?.updated_at });

          if (updated?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(updated.updated_at);
            trackMyUpdate(normalizedTimestamp);
            registerRecentSave(rundownId, normalizedTimestamp);
          }
          // Only update saved reference if content hasn't changed during save
          const currentSignatureAfterSave = createContentSignature();
          if (currentSignatureAfterSave === finalSignature) {
            lastSavedRef.current = finalSignature;
            console.log('📝 Setting lastSavedRef after UPDATE rundown save (post-conflict):', finalSignature.length);
          } else {
            console.log('⚠️ Content changed during save - scheduling micro-resave');
            scheduleMicroResave();
          }
          onSavedRef.current?.({ updatedAt: updated?.updated_at ? normalizeTimestamp(updated.updated_at) : undefined, docVersion: (updated as any)?.doc_version });
        } else {
          const updated = Array.isArray(upd1) ? upd1[0] : upd1;
          console.log('✅ AutoSave: update response', { updated_at: updated?.updated_at });

          if (updated?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(updated.updated_at);
            trackMyUpdate(normalizedTimestamp);
            registerRecentSave(rundownId, normalizedTimestamp);
          }
          // Only update saved reference if content hasn't changed during save
          const currentSignatureAfterSave = createContentSignature();
          if (currentSignatureAfterSave === finalSignature) {
            lastSavedRef.current = finalSignature;
            console.log('📝 Setting lastSavedRef after UPDATE rundown save:', finalSignature.length);
          } else {
            console.log('⚠️ Content changed during save - scheduling micro-resave');
            scheduleMicroResave();
          }
          onSavedRef.current?.({ updatedAt: updated?.updated_at ? normalizeTimestamp(updated.updated_at) : undefined, docVersion: (updated as any)?.doc_version });
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
      
      // Clear structural change flag after save completes
      if (pendingStructuralChangeRef) {
        pendingStructuralChangeRef.current = false;
      }
      
      // Optimized re-queuing for multi-user scenarios
      const currentSignature = createContentSignature();
      if (currentSignature !== currentSaveSignatureRef.current && currentSignature !== lastSavedRef.current) {
        const retryCount = (saveQueueRef.current?.retryCount || 0) + 1;
        saveQueueRef.current = { 
          signature: currentSignature, 
          retryCount 
        };
        
        // More aggressive retries for multi-user scenarios
        if (retryCount < 8) {
          const isMultiUserActive = suppressUntilRef?.current && suppressUntilRef.current > Date.now() - 1000;
          const retryDelay = isMultiUserActive ? 200 : Math.min(typingIdleMs, 400);
          console.log('🔄 AutoSave: queuing retry save in', retryDelay, 'ms (attempt', retryCount, ')');
          setTimeout(() => {
            if (saveQueueRef.current && !isSaving) {
              saveQueueRef.current = null;
              performSave();
            }
          }, retryDelay);
        } else {
          console.log('⚠️ AutoSave: max retries reached, clearing queue');
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
    // Optimized debouncing for responsive saves
    const debounceTime = isStructuralChange ? 100 : typingIdleMs; // Use 800ms as requested
    console.log('⏳ AutoSave: scheduling save', { isStructuralChange, debounceTime, hasUnsavedChanges: state.hasUnsavedChanges, typingIdleMs });

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
    };
  }, [state.hasUnsavedChanges, isInitiallyLoaded, rundownId, suppressUntilRef]);

  // Enhanced flush-on-blur/visibility-hidden to guarantee keystroke saving
  useEffect(() => {
    const handleFlushOnBlur = async () => {
      if (state.hasUnsavedChanges && rundownId && rundownId !== DEMO_RUNDOWN_ID) {
        console.log('🧯 AutoSave: flushing on tab blur/hidden to preserve keystrokes');
        try {
          await performSaveRef.current();
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
  }, [state.hasUnsavedChanges, rundownId]);

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
    markActiveTyping,
    isTypingActive
  };
};