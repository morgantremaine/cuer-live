
import { useState, useRef, useCallback, useEffect } from 'react';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export const useScratchpadEditor = (
  rundownId: string,
  rundownTitle: string,
  initialNotes: string = '',
  onNotesChange?: (notes: string) => void
) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotesRef = useRef(initialNotes);

  // Load notes from initial notes when they change
  useEffect(() => {
    if (initialNotes && initialNotes !== lastSavedNotesRef.current) {
      setNotes(initialNotes);
      lastSavedNotesRef.current = initialNotes;
      setSaveStatus('saved');
    }
  }, [initialNotes]);

  // Enhanced auto-save functionality that integrates with blueprint saving
  const scheduleAutoSave = useCallback((notesToSave: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('unsaved');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        
        // Call onNotesChange to trigger blueprint save
        onNotesChange?.(notesToSave);
        
        lastSavedNotesRef.current = notesToSave;
        setSaveStatus('saved');
        console.log('Scratchpad notes auto-saved');
      } catch (error) {
        console.error('Scratchpad auto-save failed:', error);
        setSaveStatus('unsaved');
      }
    }, 2000);
  }, [onNotesChange]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);

    // Only schedule auto-save if notes actually changed from last saved version
    if (value !== lastSavedNotesRef.current) {
      scheduleAutoSave(value);
    }
  }, [scheduleAutoSave]);

  // Text formatting functions
  const insertTextAtCursor = useCallback((beforeText: string, afterText: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + beforeText + selectedText + afterText + notes.substring(end);
    
    setNotes(newText);
    
    // Schedule auto-save for formatting changes
    if (newText !== lastSavedNotesRef.current) {
      scheduleAutoSave(newText);
    }

    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + beforeText.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  }, [notes, scheduleAutoSave]);

  const handleBold = useCallback(() => {
    insertTextAtCursor('**', '**');
  }, [insertTextAtCursor]);

  const handleItalic = useCallback(() => {
    insertTextAtCursor('*', '*');
  }, [insertTextAtCursor]);

  const handleUnderline = useCallback(() => {
    insertTextAtCursor('<u>', '</u>');
  }, [insertTextAtCursor]);

  const handleBulletList = useCallback(() => {
    insertTextAtCursor('• ');
  }, [insertTextAtCursor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    notes,
    isEditing,
    saveStatus,
    textareaRef,
    setIsEditing,
    handleNotesChange,
    handleBold,
    handleItalic,
    handleUnderline,
    handleBulletList
  };
};
