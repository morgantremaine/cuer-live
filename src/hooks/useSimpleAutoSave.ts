import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_RUNDOWN_ID } from '@/data/demoRundownData';
import { useToast } from '@/hooks/use-toast';
import { registerRecentSave } from './useRundownResumption';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
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

    const signature = JSON.stringify({
      items: cleanItems,
      title: state.title,
      startTime: state.startTime,
      timezone: state.timezone
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
    // Final check before saving - only undo blocks saves  
    if (isSaving || undoActiveRef.current) {
      console.log('💾 Save blocked: already saving or undo active');
      return;
    }
    
    // Final signature check
    const finalSignature = createContentSignature();
    
    if (finalSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      console.log('💾 No changes to save - marking as saved');
      onSaved();
      return;
    }
    
    console.log('💾 Starting save operation');
    setIsSaving(true);
    currentSaveSignatureRef.current = finalSignature;
    
    try {
      // Track this as our own update before saving
      const updateTimestamp = new Date().toISOString();
      trackMyUpdate(updateTimestamp);
      
      console.log('💾 Saving with tracking timestamp:', updateTimestamp);

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
          onSaved();
          navigate(`/rundown/${newRundown.id}`, { replace: true });
        }
      } else {
        // Enhanced update for existing rundowns with user tracking
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
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
          onSaved();
          console.log('✅ Rundown saved successfully');
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
      
      // Check if content changed during save - if so, re-queue
      const currentSignature = createContentSignature();
      if (currentSignature !== currentSaveSignatureRef.current && currentSignature !== lastSavedRef.current) {
        console.log('💾 Content changed during save - re-queuing save operation');
        saveQueueRef.current = { 
          signature: currentSignature, 
          retryCount: (saveQueueRef.current?.retryCount || 0) + 1 
        };
        
        // Re-trigger save with short delay, but max 3 retries to prevent infinite loops
        if ((saveQueueRef.current?.retryCount || 0) < 3) {
          setTimeout(() => {
            if (saveQueueRef.current && !isSaving) {
              console.log('💾 Executing re-queued save, attempt:', saveQueueRef.current.retryCount);
              saveQueueRef.current = null;
              performSave();
            }
          }, 500);
        } else {
          console.warn('💾 Max save retries reached - stopping re-queue to prevent infinite loop');
          saveQueueRef.current = null;
        }
      } else {
        // Clear queue if no more changes
        saveQueueRef.current = null;
      }
    }
  }, [rundownId, onSaved, createContentSignature, navigate, trackMyUpdate, location.state, toast, state.title, state.items, state.startTime, state.timezone, isSaving]);

  useEffect(() => {
    // Check if this is a demo rundown - skip saving but allow change detection
    if (rundownId === DEMO_RUNDOWN_ID) {
      // Still mark as saved to prevent UI from showing "unsaved" state
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Simple blocking conditions - only undo blocks saves
    if (!state.hasUnsavedChanges || undoActiveRef.current) {
      return;
    }

    // Create signature of current state - excluding ALL showcaller data
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      // Mark as saved since there are no actual content changes
      onSaved();
      return;
    }

    // Single unified debounce for all changes
    const debounceTime = 2000;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await performSave();
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, createContentSignature, performSave]);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate
  };
};