
import { useEffect, useRef } from 'react';
import { RundownState } from './useRundownState';
import { supabase } from '@/lib/supabase';

export const useSimpleAutoSave = (
  state: RundownState,
  rundownId: string | null,
  onSaved: () => void
) => {
  const lastSavedRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  useEffect(() => {
    // Don't save if no changes or no rundown ID
    if (!state.hasUnsavedChanges || !rundownId || isSavingRef.current) {
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

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      
      isSavingRef.current = true;
      
      try {
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
          console.error('Auto-save failed:', error);
        } else {
          lastSavedRef.current = currentSignature;
          onSaved();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, state.lastChanged, rundownId, onSaved]);

  return {
    isSaving: isSavingRef.current
  };
};
