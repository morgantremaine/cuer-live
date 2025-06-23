
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

  const handleBold = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `**${selectedText}**` + textarea.value.substring(end);
      updateNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  }, [updateNotes]);

  const handleItalic = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `*${selectedText}*` + textarea.value.substring(end);
      updateNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  }, [updateNotes]);

  const handleUnderline = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `<u>${selectedText}</u>` + textarea.value.substring(end);
      updateNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 3, end + 3);
      }, 0);
    }
  }, [updateNotes]);

  const handleStrikethrough = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `~~${selectedText}~~` + textarea.value.substring(end);
      updateNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  }, [updateNotes]);

  const handleBulletList = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const lines = textarea.value.split('\n');
      let currentLine = 0;
      let charCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= start) {
          currentLine = i;
          break;
        }
        charCount += lines[i].length + 1;
      }
      
      if (!lines[currentLine].trim().startsWith('•')) {
        lines[currentLine] = '• ' + lines[currentLine];
      }
      
      const newText = lines.join('\n');
      updateNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  }, [updateNotes]);

  return {
    notes: state.notes,
    saveStatus,
    textareaRef,
    handleNotesChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleStrikethrough,
    handleBulletList,
    isLoading: state.isLoading
  };
};
