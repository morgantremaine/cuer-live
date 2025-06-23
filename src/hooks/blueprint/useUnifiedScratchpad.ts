
import { useMemo } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useUnifiedScratchpad = () => {
  const { state, updateNotes } = useBlueprintContext();

  const saveStatus = useMemo(() => {
    if (state.isSaving) return 'saving';
    if (state.error) return 'error';
    return 'saved';
  }, [state.isSaving, state.error]);

  return {
    notes: state.notes,
    saveStatus,
    handleNotesChange: updateNotes,
    isLoading: state.isLoading
  };
};
