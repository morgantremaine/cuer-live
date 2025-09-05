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
  
  // Enhanced idle-based autosave system with keystroke journal integration
  const lastEditAtRef = useRef<number>(0);
  const typingIdleMs = 1500; // Reduced to 1.5s for faster saves after typing stops
  const maxSaveDelay = 8000; // Increased max delay to 8s
  const microResaveMs = 350; // Micro-resave delay increased to 350ms
  const saveInProgressRef = useRef(false);
  const saveInitiatedWhileActiveRef = useRef(false);
  const microResaveTimeoutRef = useRef<NodeJS.Timeout>();
  const postTypingSafetyTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingFollowUpSaveRef = useRef(false);
  const recentKeystrokes = useRef<number>(0);
  const maxDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Enhanced typing activity tracker with keystroke journal integration
  const markActiveTyping = useCallback(() => {
    const now = Date.now();
    lastEditAtRef.current = now;
    recentKeystrokes.current = now;
    
    console.log('⌨️ AutoSave: typing activity recorded - rescheduling save');
    
    // Record typing in journal for debugging and recovery
    keystrokeJournal.recordTyping('user typing activity');
    
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
    
    // Schedule main save after idle period
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ AutoSave: idle timeout reached - triggering save');
      performSave();
    }, typingIdleMs);
    
    // Schedule safety save that will fire regardless of main save status
    postTypingSafetyTimeoutRef.current = setTimeout(() => {
      console.log('🛡️ AutoSave: post-typing safety save - capturing any missed content');
      performSave();
    }, typingIdleMs + 2000);
    
    // Ensure a max-delay forced save will happen even during continuous typing
    if (!maxDelayTimeoutRef.current) {
      maxDelayTimeoutRef.current = setTimeout(() => {
        console.log('⏲️ AutoSave: max delay reached - forcing save');
        performSave(true);
        maxDelayTimeoutRef.current = null;
      }, maxSaveDelay);
    }
  }, [typingIdleMs, keystrokeJournal]);

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
    }, microResaveMs);
  }, []);

  // Enhanced save function with conflict prevention
  const performSave = useCallback(async (isFlushSave = false): Promise<void> => {
    // CRITICAL: Gate autosave until initial load is complete
    if (!isInitiallyLoaded) {
      debugLogger.autosave('Save blocked: initial load not complete');
      console.log('🛑 AutoSave: blocked - initial load not complete');
      return;
    }

    // REFINED STALE TAB PROTECTION: Only block NEW saves, allow saves initiated while active
    // BUT: Always allow flush saves to proceed as they're specifically for preserving keystrokes
    // ALSO: Don't block if recent keystrokes occurred (last 5 seconds) even if tab hidden
    const isTabCurrentlyInactive = document.hidden || !document.hasFocus();
    const hasRecentKeystrokes = Date.now() - recentKeystrokes.current < 5000;
    
    if (!isFlushSave && isTabCurrentlyInactive && !saveInitiatedWhileActiveRef.current && !hasRecentKeystrokes) {
      debugLogger.autosave('Save blocked: tab hidden and save not initiated while active');
      console.log('🛑 AutoSave: blocked - tab hidden and save not initiated while active');
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
            title: saveState.title,
            items: saveState.items,
            start_time: saveState.startTime,
            timezone: saveState.timezone,
            show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
            external_notes: saveState.externalNotes,
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
        console.log('💾 AutoSave: updating rundown', { rundownId, items: saveState.items?.length, title: saveState.title });

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
          title: saveState.title,
          items: saveState.items,
          start_time: saveState.startTime,
          timezone: saveState.timezone,
          show_date: saveState.showDate ? `${saveState.showDate.getFullYear()}-${String(saveState.showDate.getMonth() + 1).padStart(2, '0')}-${String(saveState.showDate.getDate()).padStart(2, '0')}` : null,
          external_notes: saveState.externalNotes,
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
        const mergedItems = saveState.items?.map((localItem: any) => {
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
        const localItemIds = new Set(saveState.items?.map(item => item.id) || []);
        const newRemoteItems = latestRundown.items?.filter((item: any) => !localItemIds.has(item.id)) || [];
        
        const finalMergedItems = [...mergedItems, ...newRemoteItems];
        
        // Update the base update with merged data
        Object.assign(baseUpdate, {
          items: finalMergedItems,
          // Preserve our local changes for non-item fields unless remote is newer
          title: saveState.title, // Keep our title change
          start_time: saveState.startTime, // Keep our timing change
          timezone: saveState.timezone, // Keep our timezone change
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
          // Enhanced change detection during save with typing awareness
          const currentSignatureAfterSave = createContentSignature();
          if (currentSignatureAfterSave === finalSignature) {
            lastSavedRef.current = finalSignature;
            console.log('📝 Setting lastSavedRef after UPDATE rundown save:', finalSignature.length);
          } else {
            // Check if user is still typing - if so, let the typing handler manage the save
            if (isTypingActive()) {
              console.log('⌨️ Content changed during save but user still typing - letting typing handler manage next save');
            } else {
              console.log('⚠️ Content changed during save - scheduling micro-resave');
              scheduleMicroResave();
            }
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