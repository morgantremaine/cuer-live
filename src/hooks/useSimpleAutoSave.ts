
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
  const typingSessionRef = useRef<string | null>(null);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('💾 Auto-save undo coordination:', active ? 'PAUSED' : 'RESUMED');
  };

  // Set typing session to prevent auto-save during rapid typing
  const setTypingSession = (sessionKey: string | null) => {
    typingSessionRef.current = sessionKey;
    if (sessionKey) {
      console.log('💾 Auto-save paused for typing session:', sessionKey);
    } else {
      console.log('💾 Auto-save resumed after typing session');
    }
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
    // Don't save if not initialized, undo is active, currently saving, or in typing session
    if (!isInitializedRef.current || undoActiveRef.current || isSaving || typingSessionRef.current) {
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

    // Minimum interval between saves (3 seconds)
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 3000) {
      console.log('💾 Auto-save throttled - scheduling for later');
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Schedule save for when throttle period expires
      const timeToWait = 3000 - (now - lastSaveTimeRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        // Only execute if conditions are still valid
        if (!typingSessionRef.current && !undoActiveRef.current && !isSaving) {
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

    // Debounce the save with longer delay to prevent rapid firing
    saveTimeoutRef.current = setTimeout(() => {
      // Double-check conditions when timeout executes
      if (!typingSessionRef.current && !undoActiveRef.current && !isSaving) {
        executeSave(currentSignature);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, rundownId, onSaved, state.items, state.columns, state.title, state.startTime, state.timezone, isSaving]);

  const executeSave = async (currentSignature: string) => {
    // Final check before saving
    if (isSaving || undoActiveRef.current || typingSessionRef.current) {
      console.log('💾 Auto-save cancelled - conditions changed');
      return;
    }
    
    setIsSaving(true);
    lastSaveTimeRef.current = Date.now();
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
    setUndoActive,
    setTypingSession
  };
};
