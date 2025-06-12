
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
  const creationInProgressRef = useRef(false);
  const createdRundownIdRef = useRef<string | null>(null); // Track the ID we created

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('💾 Auto-save undo coordination:', active ? 'PAUSED' : 'RESUMED');
  };

  useEffect(() => {
    // Don't save if no changes or if undo is active
    if (!state.hasUnsavedChanges || undoActiveRef.current) {
      return;
    }

    // If we're not on a new rundown and have a valid ID, don't create a new one
    if (rundownId && rundownId !== 'new') {
      return;
    }

    // If we already created a rundown, don't create another one
    if (createdRundownIdRef.current) {
      console.log('⏭️ Skipping creation - already created rundown:', createdRundownIdRef.current);
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

    console.log('💾 Auto-save triggered for rundown:', rundownId || 'NEW');

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check conditions when timeout executes
      if (isSaving || undoActiveRef.current || creationInProgressRef.current || createdRundownIdRef.current) {
        console.log('⏭️ Skipping save - conditions changed:', {
          isSaving,
          undoActive: undoActiveRef.current,
          creationInProgress: creationInProgressRef.current,
          alreadyCreated: !!createdRundownIdRef.current
        });
        return;
      }
      
      setIsSaving(true);
      console.log('💾 Executing auto-save...');
      
      try {
        // For new rundowns, we need to create them first
        if (!rundownId || rundownId === 'new') {
          console.log('💾 Creating new rundown...');
          
          // Prevent multiple creation attempts
          creationInProgressRef.current = true;
          
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .limit(1)
            .single();

          if (teamError || !teamData) {
            console.error('❌ Could not get team for new rundown:', teamError);
            creationInProgressRef.current = false;
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
            creationInProgressRef.current = false;
          } else {
            console.log('✅ New rundown created:', newRundown.id);
            createdRundownIdRef.current = newRundown.id;
            lastSavedRef.current = currentSignature;
            onSaved();
            
            // Update URL immediately to prevent duplicate creations
            const newUrl = `/rundown/${newRundown.id}`;
            window.history.replaceState(null, '', newUrl);
            console.log('🔄 Updated URL to:', newUrl);
            
            creationInProgressRef.current = false;
          }
        } else {
          // Update existing rundown
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
        if (!rundownId || rundownId === 'new') {
          creationInProgressRef.current = false;
        }
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, state.items, state.columns, state.title, state.startTime, state.timezone, isSaving]);

  // Reset creation tracking when rundown ID changes to a real ID
  useEffect(() => {
    if (rundownId && rundownId !== 'new' && createdRundownIdRef.current) {
      console.log('🔄 Rundown ID updated, resetting creation tracking');
      createdRundownIdRef.current = null;
      creationInProgressRef.current = false;
    }
  }, [rundownId]);

  return {
    isSaving,
    setUndoActive
  };
};
