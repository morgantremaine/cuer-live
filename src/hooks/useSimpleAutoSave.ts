
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const navigate = useNavigate();
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const trackOwnUpdateRef = useRef<((timestamp: string) => void) | null>(null);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
  };

  // Function to set the own update tracker from realtime hook
  const setTrackOwnUpdate = (tracker: (timestamp: string) => void) => {
    trackOwnUpdateRef.current = tracker;
  };

  useEffect(() => {
    // Don't save if no changes or if undo is active
    if (!state.hasUnsavedChanges || undoActiveRef.current) {
      return;
    }

    // Create a signature of the current state
    const currentSignature = JSON.stringify({
      items: state.items,
      columns: state.columns,
      title: state.title,
      startTime: state.startTime,
      timezone: state.timezone
    });

    // Only save if state actually changed
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Rate limiting: don't save more than once every 2 seconds for efficiency
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 2000; // 2 seconds minimum between saves
    
    // If we just saved recently, extend the debounce time
    const debounceTime = timeSinceLastSave < minSaveInterval ? 3000 : 1000;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save with dynamic timing
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check undo isn't active when timeout executes
      if (isSaving || undoActiveRef.current) return;
      
      // Check if state changed again during debounce
      const finalSignature = JSON.stringify({
        items: state.items,
        columns: state.columns,
        title: state.title,
        startTime: state.startTime,
        timezone: state.timezone
      });
      
      if (finalSignature === lastSavedRef.current) {
        return;
      }
      
      setIsSaving(true);
      lastSaveTimeRef.current = Date.now();
      
      try {
        const updateTimestamp = new Date().toISOString();

        // Track this as our own update BEFORE saving
        if (trackOwnUpdateRef.current) {
          trackOwnUpdateRef.current(updateTimestamp);
        }

        // For new rundowns, we need to create them first
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

          const { data: newRundown, error: createError } = await supabase
            .from('rundowns')
            .insert({
              title: state.title,
              items: state.items,
              columns: state.columns,
              start_time: state.startTime,
              timezone: state.timezone,
              team_id: teamData.team_id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              updated_at: updateTimestamp
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Save failed:', createError);
          } else {
            lastSavedRef.current = finalSignature;
            onSaved();
            
            // Update the URL to reflect the new rundown ID
            navigate(`/rundown/${newRundown.id}`, { replace: true });
          }
        } else {
          const { error } = await supabase
            .from('rundowns')
            .update({
              title: state.title,
              items: state.items,
              columns: state.columns,
              start_time: state.startTime,
              timezone: state.timezone,
              updated_at: updateTimestamp
            })
            .eq('id', rundownId);

          if (error) {
            console.error('❌ Save failed:', error);
          } else {
            lastSavedRef.current = finalSignature;
            onSaved();
          }
        }
      } catch (error) {
        console.error('❌ Save error:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, state.items, state.columns, state.title, state.startTime, state.timezone, isSaving, navigate]);

  return {
    isSaving,
    setUndoActive,
    setTrackOwnUpdate
  };
};
