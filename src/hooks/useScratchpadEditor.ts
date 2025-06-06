
import { useState, useRef, useCallback, useEffect } from 'react';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';

export const useScratchpadEditor = (
  rundownId: string, 
  rundownTitle: string, 
  initialNotes: string = '', 
  onNotesChange?: (notes: string) => void
) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);

  // Get blueprint persistence functions
  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    '', // showDate not needed for scratchpad
    savedBlueprint,
    setSavedBlueprint
  );

  // Load existing notes from blueprint
  useEffect(() => {
    if (rundownId && !savedBlueprint) {
      const loadNotes = async () => {
        try {
          const blueprintData = await loadBlueprint();
          if (blueprintData?.notes) {
            setNotes(blueprintData.notes);
          }
        } catch (error) {
          // Silently handle error
        }
      };
      loadNotes();
    }
  }, [rundownId, loadBlueprint, savedBlueprint]);

  // Auto-save notes
  const saveNotes = useCallback(async (notesToSave: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveBlueprint(
          savedBlueprint?.lists || [],
          true, // silent save
          savedBlueprint?.show_date || null, // Ensure null instead of empty string
          notesToSave,
          savedBlueprint?.crew_data,
          savedBlueprint?.camera_plots
        );
        setSaveStatus('saved');
        onNotesChange?.(notesToSave);
      } catch (error) {
        setSaveStatus('error');
      }
    }, 1000);
  }, [saveBlueprint, savedBlueprint, onNotesChange]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    saveNotes(value);
  }, [saveNotes]);

  const handleBold = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `**${selectedText}**` + textarea.value.substring(end);
      setNotes(newText);
      saveNotes(newText);
      
      // Set cursor position after the inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
      }, 0);
    }
  }, [saveNotes]);

  const handleItalic = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `*${selectedText}*` + textarea.value.substring(end);
      setNotes(newText);
      saveNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  }, [saveNotes]);

  const handleUnderline = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = textarea.value.substring(0, start) + `<u>${selectedText}</u>` + textarea.value.substring(end);
      setNotes(newText);
      saveNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 3, end + 3);
      }, 0);
    }
  }, [saveNotes]);

  const handleBulletList = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const lines = textarea.value.split('\n');
      let currentLine = 0;
      let charCount = 0;
      
      // Find which line the cursor is on
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= start) {
          currentLine = i;
          break;
        }
        charCount += lines[i].length + 1; // +1 for the newline character
      }
      
      // Add bullet point to current line
      if (!lines[currentLine].trim().startsWith('•')) {
        lines[currentLine] = '• ' + lines[currentLine];
      }
      
      const newText = lines.join('\n');
      setNotes(newText);
      saveNotes(newText);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  }, [saveNotes]);

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
