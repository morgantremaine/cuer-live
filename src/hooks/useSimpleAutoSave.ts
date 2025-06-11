
import { useEffect, useRef, useState } from 'react';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);
  const undoActiveRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('💾 Auto-save undo coordination:', active ? 'PAUSED' : 'RESUMED');
  };

  // Initialize tracking after first render to avoid initial saves
  useEffect(() => {
    if (!isInitializedRef.current && state.items && state.items.length > 0) {
      const initialSignature = JSON.stringify({
        items: state.items,
        columns: state.columns,
        title: state.title,
        startTime: state.startTime,
        timezone: state.timezone
      });
      lastSavedRef.current = initialSignature;
      isInitializedRef.current = true;
      console.log('💾 Auto-save initialized with signature');
    }
  }, [state.items, state.columns, state.title, state.startTime, state.timezone]);

  useEffect(() => {
    // Don't save if not initialized, undo is active, or currently saving
    if (!isInitializedRef.current || undoActiveRef.current || isSaving) {
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

    // Only proceed if state actually changed
    if (currentSignature === lastSavedRef.current) {
      return;
    }

    // Don't save if we have unsaved changes but no actual content changes
    if (!state.hasUnsavedChanges) {
      return;
    }

    // Minimum interval between saves (2 seconds)
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000 && !pendingSaveRef.current) {
      console.log('💾 Auto-save throttled - scheduling for later');
      pendingSaveRef.current = true;
      
      // Schedule a save for when the throttle period expires
      const timeToWait = 2000 - (now - lastSaveTimeRef.current);
      setTimeout(() => {
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          // Trigger the effect again by forcing a re-evaluation
          const newSignature = JSON.stringify({
            items: state.items,
            columns: state.columns,
            title: state.title,
            startTime: state.startTime,
            timezone: state.timezone
          });
          if (newSignature !== lastSavedRef.current) {
            console.log('💾 Executing throttled auto-save...');
            executeSave(newSignature);
          }
        }
      }, timeToWait);
      return;
    }

    console.log('💾 Auto-save triggered for rundown:', rundownId || 'NEW');

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save with longer delay
    saveTimeoutRef.current = setTimeout(() => {
      executeSave(currentSignature);
    }, 1500); // Reduced debounce slightly

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, rundownId, onSaved, state.items, state.columns, state.title, state.startTime, state.timezone, isSaving]);

  const executeSave = async (currentSignature: string) => {
    // Double-check conditions when timeout executes
    if (isSaving || undoActiveRef.current) {
      console.log('💾 Auto-save cancelled - conditions changed');
      return;
    }
    
    setIsSaving(true);
    lastSaveTimeRef.current = Date.now();
    pendingSaveRef.current = false;
    console.log('💾 Executing auto-save...');
    
    try {
      // For new rundowns, we need to create them first
      if (!rundownId) {
        console.log('💾 Creating new rundown...');
        
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
          console.error('❌ Auto-save failed (create):', createError);
        } else {
          console.log('✅ New rundown created:', newRundown.id);
          lastSavedRef.current = currentSignature;
          onSaved();
          window.history.replaceState(null, '', `/rundown/${newRundown.id}`);
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
          console.error('❌ Auto-save failed (update):', error);
        } else {
          console.log('✅ Auto-save successful');
          lastSavedRef.current = currentSignature;
          onSaved();
        }
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    setUndoActive
  };
};
