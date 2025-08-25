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

  // Track own updates
  const trackMyUpdate = useCallback((timestamp: string) => {
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = useCallback((tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  }, []);

  // Simplified placeholder functions for API compatibility
  const setUserTyping = useCallback((typing: boolean) => {
    // Simplified - no longer blocks saves
    console.log('⌨️ User typing state changed:', typing);
  }, []);

  const markStructuralChange = useCallback(() => {
    // Simplified - no longer affects save timing
    console.log('📊 Structural change noted');
  }, []);

  useEffect(() => {
    // Check if this is a demo rundown - skip saving but allow change detection
    if (rundownId === DEMO_RUNDOWN_ID) {
      if (state.hasUnsavedChanges) {
        onSaved();
      }
      return;
    }

    // Simple blocking conditions - only block for undo operations and active saves
    if (!state.hasUnsavedChanges || undoActiveRef.current || isSaving) {
      return;
    }

    // Create signature of current state - excluding ALL showcaller data
    const currentSignature = createContentSignature();

    // Only save if content actually changed
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Simple consistent debounce - 2 seconds for all changes
    saveTimeoutRef.current = setTimeout(async () => {
      // Final check before saving
      if (isSaving || undoActiveRef.current) {
        return;
      }
      
      // Final signature check
      const finalSignature = createContentSignature();
      if (finalSignature === lastSavedRef.current) {
        return;
      }
      
      setIsSaving(true);
      
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

          const { data: newRundown, error: createError } = await supabase
            .from('rundowns')
            .insert({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              team_id: teamData.team_id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              folder_id: folderId,
              updated_at: updateTimestamp
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
          // Simple update for existing rundowns
          const { data, error } = await supabase
            .from('rundowns')
            .update({
              title: state.title,
              items: state.items,
              start_time: state.startTime,
              timezone: state.timezone,
              updated_at: new Date().toISOString()
            })
            .eq('id', rundownId)
            .select('updated_at')
            .single();

          if (error) {
            console.error('❌ Save failed:', error);
            toast({
              title: "Save failed",
              description: "Unable to save changes. Please try again.",
              variant: "destructive",
              duration: 5000,
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
      } finally {
        setIsSaving(false);
        saveTimeoutRef.current = undefined as unknown as NodeJS.Timeout;
      }
    }, 2000); // Simple 2-second debounce for all changes

  }, [state.hasUnsavedChanges, rundownId, onSaved, isSaving, navigate, trackMyUpdate, location.state?.folderId, toast, createContentSignature]);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate,
    setUserTyping,
    markStructuralChange
  };
};