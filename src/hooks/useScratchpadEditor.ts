
import { useState, useRef, useCallback, useEffect } from 'react';
import { useBlueprintStorage } from './useBlueprintStorage';

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

  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  // Load notes from saved blueprint when it changes
  useEffect(() => {
    if (savedBlueprint?.notes && savedBlueprint.notes !== lastSavedNotesRef.current) {
      const loadedNotes = savedBlueprint.notes;
      console.log('Loading notes from blueprint:', loadedNotes);
      setNotes(loadedNotes);
      lastSavedNotesRef.current = loadedNotes;
      setSaveStatus('saved');
    }
  }, [savedBlueprint]);

  // Auto-save functionality with debouncing
  const scheduleAutoSave = useCallback((notesToSave: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('unsaved');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        
        if (savedBlueprint) {
          await saveBlueprint(rundownTitle, savedBlueprint.lists, savedBlueprint.show_date, true, notesToSave);
          lastSavedNotesRef.current = notesToSave;
          setSaveStatus('saved');
          console.log('Notes auto-saved successfully');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('unsaved');
      }
    }, 2000);
  }, [savedBlueprint, saveBlueprint, rundownTitle]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    onNotesChange?.(value);

    // Only schedule auto-save if notes actually changed from last saved version
    if (value !== lastSavedNotesRef.current) {
      scheduleAutoSave(value);
    }
  }, [onNotesChange, scheduleAutoSave]);

  // Text formatting functions
  const insertTextAtCursor = useCallback((beforeText: string, afterText: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + beforeText + selectedText + afterText + notes.substring(end);
    
    setNotes(newText);
    onNotesChange?.(newText);
    
    // Schedule auto-save
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
  }, [notes, onNotesChange, scheduleAutoSave]);

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
