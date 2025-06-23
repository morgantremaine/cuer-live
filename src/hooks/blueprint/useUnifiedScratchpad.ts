
import { useMemo, useRef, useCallback } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useUnifiedScratchpad = () => {
  const { state, updateNotes } = useBlueprintContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saveStatus = useMemo(() => {
    if (state.isSaving) return 'saving';
    if (state.error) return 'error';
    return 'saved';
  }, [state.isSaving, state.error]);

  const handleNotesChange = useCallback((value: string) => {
    updateNotes(value);
  }, [updateNotes]);

  // Legacy formatting functions for backward compatibility
  const handleBold = useCallback(() => {
    const element = textareaRef.current as any;
    element?.applyBold?.();
  }, []);

  const handleItalic = useCallback(() => {
    const element = textareaRef.current as any;
    element?.applyItalic?.();
  }, []);

  const handleUnderline = useCallback(() => {
    const element = textareaRef.current as any;
    element?.applyUnderline?.();
  }, []);

  const handleBulletList = useCallback(() => {
    const element = textareaRef.current as any;
    element?.insertBulletList?.();
  }, []);

  return {
    notes: state.notes,
    saveStatus,
    textareaRef,
    handleNotesChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList,
    isLoading: state.isLoading
  };
};
