import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { useTabVisibilityAutoSave } from './useTabVisibilityAutoSave';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void,
  pendingStructuralChangeRef?: React.MutableRefObject<boolean>,
  suppressUntilRef?: React.MutableRefObject<number>
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

  // Helper to derive show_date from localStorage or fallback
  const deriveShowDate = useCallback(() => {
    // Try to get date from localStorage (set by DateTimePicker)
    try {
      const storedDateTime = localStorage.getItem(`rundown-datetime-${rundownId || 'new'}`);
      if (storedDateTime) {
        const storedDate = new Date(storedDateTime);
        if (!isNaN(storedDate.getTime())) {
          return storedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Fallback: today's date
    return new Date().toISOString().split('T')[0];
  }, [rundownId]);

  // Create content signature that ONLY includes actual content (NO showcaller fields at all)
  const createContentSignature = useCallback(() => {
    // Create signature with ONLY content fields - completely exclude ALL showcaller data
    const cleanItems = state.items?.map(item => {
      return {
        id: item.id,
        type: item.type,
        rowNumber: item.rowNumber,
        name: item.name,
        startTime: item.startTime,
        duration: item.duration,
        endTime: item.endTime,
        talent: item.talent,
        script: item.script,
        gfx: item.gfx,
        video: item.video,
        images: item.images,
        notes: item.notes,
        color: item.color,
        isFloating: item.isFloating,
        customFields: item.customFields
        // EXPLICITLY EXCLUDED: status, elapsedTime, and any other showcaller fields
      };
    }) || [];

    // Create a stable signature that includes show_date separately
    const signature = JSON.stringify({
      items: cleanItems,
      title: state.title,
      startTime: state.startTime, // HH:MM:SS time portion only
      timezone: state.timezone,
      showDate: deriveShowDate() // Include derived show_date in signature
    });

    return signature;
  }, [state.items, state.title, state.startTime, state.timezone]);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
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

  // Enhanced save function with re-queuing logic
  const performSave = useCallback(async (): Promise<void> => {
    // Check suppression cooldown to prevent ping-pong
    if (suppressUntilRef?.current && suppressUntilRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: teammate update cooldown active');
      return;
    }
    
    // Final check before saving - only undo blocks saves  
    if (isSaving || undoActiveRef.current) {
      debugLogger.autosave('Save blocked: already saving or undo active');
      return;
    }
    
    // Final signature check
    const finalSignature = createContentSignature();
    
    if (finalSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      debugLogger.autosave('No changes to save - marking as saved');
      onSaved();
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
        const showDate = deriveShowDate();
        const { data: newRundown, error: createError } = await supabase
          .from('rundowns')
          .insert({
            title: state.title,
            items: state.items,
            start_time: state.startTime, // HH:MM:SS only
            show_date: showDate, // YYYY-MM-DD
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
          onSaved();
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        // Enhanced update for existing rundowns with user tracking
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        const showDate = deriveShowDate();
        const { data, error } = await supabase
          .from('rundowns')
          .update({
            title: state.title,
            items: state.items,
            start_time: state.startTime, // HH:MM:SS only
            show_date: showDate, // YYYY-MM-DD
            timezone: state.timezone,
            updated_at: new Date().toISOString(),
            last_updated_by: currentUserId
          })
          .eq('id', rundownId)
          .select('updated_at')
          .single();

        if (error) {
          console.error('❌ Save failed:', error);
          debugLogger.autosave('Save failed with error', error);
          toast({
            title: "Save failed",
            description: "Unable to save changes. Will retry automatically.",
            variant: "destructive",
            duration: 3000,
          });
          // Don't return here - we still want to set lastSavedRef and call onSaved on successful response
        } else {
          // Track the actual timestamp returned by the database
          if (data?.updated_at) {
            const normalizedTimestamp = normalizeTimestamp(data.updated_at);
            trackMyUpdate(normalizedTimestamp);
            // Register this save to prevent false positives in resumption
            registerRecentSave(rundownId, normalizedTimestamp);
          }
          lastSavedRef.current = finalSignature;
          onSaved();
          debugLogger.autosave('Save successful for existing rundown');
        }
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      debugLogger.autosave('Save threw exception', error);
      toast({
        title: "Save failed", 
        description: "Unable to save changes. Will retry automatically.",
        variant: "destructive",
        duration: 3000,
      });
      // Don't modify lastSavedRef or call onSaved on error
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
            if (saveQueueRef.current && !isSaving) {
              saveQueueRef.current = null;
              performSave();
            }
          }, 500);
        } else {
          saveQueueRef.current = null;
        }
      } else {
        // Clear queue if no more changes
        saveQueueRef.current = null;
      }
    }
  }, [rundownId, onSaved, createContentSignature, navigate, trackMyUpdate, location.state, toast, state.title, state.items, state.startTime, state.timezone, isSaving, suppressUntilRef, deriveShowDate]);

  // Tab visibility save for unsaved changes on tab hide
  useTabVisibilityAutoSave({
    state,
    rundownId,
    performSave,
    createContentSignature,
    lastSavedRef,
    isDemo: rundownId === DEMO_RUNDOWN_ID
  });

  useEffect(() => {
    // Check if this is a demo rundown - skip saving but allow change detection
    if (rundownId === DEMO_RUNDOWN_ID) {
      // Still mark as saved to prevent UI from showing "unsaved" state
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Always check for content changes, even if hasUnsavedChanges is false
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Simple blocking conditions - only undo blocks saves
    if (undoActiveRef.current) {
      debugLogger.autosave('Save blocked: undo operation active');
      return;
    }

    // Determine if this is a structural change
    const isStructuralChange = pendingStructuralChangeRef?.current || false;
    
    // Check suppression cooldown - but bypass entirely for structural changes
    if (!isStructuralChange && suppressUntilRef?.current && suppressUntilRef.current > Date.now()) {
      debugLogger.autosave('Save blocked: teammate update cooldown active, scheduling delayed save');
      
      // Schedule a save attempt after cooldown expires
      const cooldownRemaining = suppressUntilRef.current - Date.now();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        // Double-check if save is still needed after cooldown
        const latestSignature = createContentSignature();
        if (latestSignature !== lastSavedRef.current && !undoActiveRef.current) {
          debugLogger.autosave('Executing delayed save after cooldown');
          await performSave();
        }
      }, cooldownRemaining + 100); // Small buffer after cooldown expires
      
      return;
    }

    // Immediate save for structural changes, short debounce for text edits
    const debounceTime = isStructuralChange ? 100 : (state.hasUnsavedChanges ? 1500 : 500);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      debugLogger.autosave('Executing scheduled save');
      await performSave();
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, state.items, state.title, state.startTime, state.timezone, rundownId, onSaved, createContentSignature, performSave, suppressUntilRef, pendingStructuralChangeRef]);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate
  };
};