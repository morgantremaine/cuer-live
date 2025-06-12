
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
  const lastTriggerTimeRef = useRef<number>(0);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    // Only log state changes, not every coordination call
    if (active) {
      console.log('💾 Auto-save paused for undo operation');
    }
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

    // Throttle console logging - only log every 2 seconds to reduce noise
    const now = Date.now();
    const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
    const shouldLog = timeSinceLastTrigger > 2000;
    
    if (shouldLog) {
      lastTriggerTimeRef.current = now;
    }

    // Rate limiting: don't save more than once every 2 seconds for efficiency
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minSaveInterval = 2000; // 2 seconds minimum between saves
    
    // If we just saved recently, extend the debounce time
    const debounceTime = timeSinceLastSave < minSaveInterval ? 3000 : 1000;

    if (shouldLog) {
      console.log('💾 Auto-save scheduled for rundown:', rundownId || 'NEW');
    }

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
      console.log('💾 Saving rundown...');
      
      try {
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
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Save failed:', createError);
          } else {
            console.log('✅ New rundown created:', newRundown.id);
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
              updated_at: new Date().toISOString()
            })
            .eq('id', rundownId);

          if (error) {
            console.error('❌ Save failed:', error);
          } else {
            console.log('✅ Rundown saved');
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
    setUndoActive
  };
};
