
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
  const createdRundownIdRef = useRef<string | null>(null);
  const lastTitleChangeRef = useRef<number>(0);

  // Function to coordinate with undo operations
  const setUndoActive = (active: boolean) => {
    undoActiveRef.current = active;
    console.log('💾 Auto-save undo coordination:', active ? 'PAUSED' : 'RESUMED');
  };

  // Get the effective rundown ID (either the passed ID or the one we created)
  const getEffectiveRundownId = () => {
    if (rundownId && rundownId !== 'new' && rundownId !== 'NEW') {
      return rundownId;
    }
    return createdRundownIdRef.current;
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

    const effectiveRundownId = getEffectiveRundownId();
    console.log('💾 Auto-save triggered for rundown:', rundownId || 'NEW', 'effective ID:', effectiveRundownId);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // For title changes, use longer debounce to avoid excessive saves
    const now = Date.now();
    const isRecentTitleChange = now - lastTitleChangeRef.current < 2000;
    const debounceTime = isRecentTitleChange ? 3000 : 1000;

    console.log('💾 Scheduling save with debounce:', debounceTime + 'ms');

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check conditions when timeout executes
      if (isSaving || undoActiveRef.current) {
        console.log('⏭️ Skipping save - conditions changed:', {
          isSaving,
          undoActive: undoActiveRef.current
        });
        return;
      }
      
      setIsSaving(true);
      console.log('💾 Executing auto-save...');
      
      try {
        const currentEffectiveId = getEffectiveRundownId();
        
        if (!currentEffectiveId) {
          // Create new rundown
          console.log('💾 Creating new rundown...');
          
          // Prevent multiple creation attempts
          if (creationInProgressRef.current) {
            console.log('⏭️ Creation already in progress, skipping');
            return;
          }
          
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
            
            // Update URL immediately to reflect the new rundown
            const newUrl = `/rundown/${newRundown.id}`;
            window.history.replaceState(null, '', newUrl);
            console.log('🔄 Updated URL to:', newUrl);
            
            // Call onSaved to notify the parent component
            onSaved();
            
            creationInProgressRef.current = false;
          }
        } else {
          // Update existing rundown
          console.log('💾 Updating existing rundown:', currentEffectiveId);
          
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
            .eq('id', currentEffectiveId);

          if (error) {
            console.error('❌ Auto-save failed (update):', error);
          } else {
            console.log('✅ Auto-save successful (update)');
            lastSavedRef.current = currentSignature;
            onSaved();
          }
        }
      } catch (error) {
        console.error('❌ Auto-save error:', error);
        if (!getEffectiveRundownId()) {
          creationInProgressRef.current = false;
        }
      } finally {
        setIsSaving(false);
      }
    }, debounceTime);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved, state.items, state.columns, state.title, state.startTime, state.timezone, isSaving]);

  // Track title changes for debouncing
  useEffect(() => {
    lastTitleChangeRef.current = Date.now();
  }, [state.title]);

  // Reset creation tracking when rundown ID changes to a real ID
  useEffect(() => {
    if (rundownId && rundownId !== 'new' && rundownId !== 'NEW') {
      if (createdRundownIdRef.current && createdRundownIdRef.current !== rundownId) {
        console.log('🔄 Rundown ID updated from', createdRundownIdRef.current, 'to', rundownId);
        createdRundownIdRef.current = rundownId; // Sync the created ID
      }
      creationInProgressRef.current = false;
    }
  }, [rundownId]);

  // Export the effective rundown ID for other components to use
  const effectiveRundownId = getEffectiveRundownId();

  return {
    isSaving,
    setUndoActive,
    effectiveRundownId // Export this so other components can use the real ID
  };
};
