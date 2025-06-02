
import { useState, useRef, useEffect } from 'react';
import { useBlueprintStorage } from '@/hooks/useBlueprintStorage';

export const useScratchpadEditor = (
  rundownId: string,
  rundownTitle: string,
  initialNotes: string = '',
  onNotesChange?: (notes: string) => void
) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  // Load notes from saved blueprint when available
  useEffect(() => {
    if (savedBlueprint?.notes !== undefined) {
      console.log('Loading notes from blueprint:', savedBlueprint.notes);
      setNotes(savedBlueprint.notes || '');
      setSaveStatus('saved');
    }
  }, [savedBlueprint?.notes]);

  const handleNotesChange = (value: string) => {
    console.log('Notes changed:', value);
    setNotes(value);
    setSaveStatus('unsaved');
    onNotesChange?.(value);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveNotes(value);
    }, 2000);
  };

  const autoSaveNotes = async (notesToSave: string) => {
    console.log('Starting auto-save with notes:', notesToSave);
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // Get current blueprint data or use defaults
      const listsToSave = savedBlueprint?.lists || [];
      const showDate = savedBlueprint?.show_date;
      
      console.log('Saving blueprint with:', {
        rundownId,
        rundownTitle,
        listsCount: listsToSave.length,
        showDate,
        notesLength: notesToSave.length
      });
      
      await saveBlueprint(
        rundownTitle,
        listsToSave,
        showDate,
        true, // silent save
        notesToSave
      );
      
      console.log('Notes auto-saved successfully');
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to auto-save notes:', error);
      setSaveStatus('unsaved');
    } finally {
      setIsSaving(false);
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + before + selectedText + after + notes.substring(end);
    
    handleNotesChange(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleUnderline = () => insertText('__', '__');
  const handleBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = notes.lastIndexOf('\n', start - 1) + 1;
    const newText = notes.substring(0, lineStart) + '• ' + notes.substring(lineStart);
    
    handleNotesChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  };

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
