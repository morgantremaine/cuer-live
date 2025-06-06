
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
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

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
    if (!rundownId || isInitialized || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const loadNotes = async () => {
      try {
        const blueprintData = await loadBlueprint();
        if (blueprintData?.notes && typeof blueprintData.notes === 'string') {
          setNotes(blueprintData.notes);
        } else if (initialNotes) {
          setNotes(initialNotes);
        }
      } catch (error) {
        console.log('Failed to load notes, using initial notes');
        if (initialNotes) {
          setNotes(initialNotes);
        }
      } finally {
        setIsInitialized(true);
        initializationRef.current = false;
      }
    };
    
    loadNotes();
  }, [rundownId, initialNotes, loadBlueprint, isInitialized]);

  // Debounced auto-save notes
  const saveNotes = useCallback(async (notesToSave: string) => {
    if (!isInitialized) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveBlueprint(
          savedBlueprint?.lists || [], // updatedLists
          true, // silent save
          savedBlueprint?.show_date || null, // showDateOverride
          notesToSave, // notes
          savedBlueprint?.crew_data, // crewData
          savedBlueprint?.camera_plots // cameraPlots
        );
        setSaveStatus('saved');
        onNotesChange?.(notesToSave);
      } catch (error) {
        console.error('Error saving scratchpad notes:', error);
        setSaveStatus('error');
        // Retry once after a delay
        setTimeout(() => {
          saveNotes(notesToSave);
        }, 2000);
      }
    }, 1000);
  }, [saveBlueprint, savedBlueprint, onNotesChange, isInitialized]);

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
