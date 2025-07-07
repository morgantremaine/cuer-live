
import { useState, useEffect, useCallback } from 'react';
import { ScratchpadNote, ScratchpadState } from '@/types/scratchpad';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useScratchpadNotes = (rundownId: string) => {
  const { state, updateNotes } = useBlueprintContext();
  const [localState, setLocalState] = useState<ScratchpadState>({
    notes: [],
    activeNoteId: null,
    searchQuery: ''
  });

  // Track manually renamed notes
  const [manuallyRenamedNotes, setManuallyRenamedNotes] = useState<Set<string>>(new Set());

  // Auto-save debounce timer
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notes from blueprint context
  useEffect(() => {
    if (isInitialized) return;
    
    try {
      // Try to parse notes from blueprint context as JSON (new format)
      let parsedNotes = [];
      if (state.notes && typeof state.notes === 'string') {
        try {
          const parsed = JSON.parse(state.notes);
          if (Array.isArray(parsed)) {
            // Validate each note has required fields and clean content
            parsedNotes = parsed.filter(note => 
              note && 
              typeof note === 'object' && 
              note.id && 
              note.title !== undefined && 
              note.content !== undefined
            ).map(note => ({
              ...note,
              // Clean up any malformed content
              content: typeof note.content === 'string' ? note.content : ''
            }));
          } else if (typeof parsed === 'object' && parsed.content) {
            // Single note object
            parsedNotes = [parsed];
          } else {
            // Treat as plain text but clean it up
            let cleanContent = typeof parsed === 'string' ? parsed : state.notes;
            cleanContent = cleanupMalformedJson(cleanContent);
            
            parsedNotes = [{
              id: `note-${Date.now()}`,
              title: 'Show Notes',
              content: cleanContent,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
          }
        } catch {
          // Handle plain text format - clean up any malformed JSON
          let cleanContent = cleanupMalformedJson(state.notes);
          
          parsedNotes = [{
            id: `note-${Date.now()}`,
            title: 'Show Notes',
            content: cleanContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }];
        }
      }

      if (parsedNotes.length === 0) {
        parsedNotes = [{
          id: `note-${Date.now()}`,
          title: 'Show Notes',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
      }

      setLocalState(prev => ({
        ...prev,
        notes: parsedNotes,
        activeNoteId: parsedNotes[0]?.id || null
      }));
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing scratchpad notes:', error);
      createDefaultNote();
    }
  }, [state.notes, isInitialized]);

  // Helper function to clean up malformed JSON content
  const cleanupMalformedJson = (content: string): string => {
    if (!content) return '';
    
    // Remove any trailing JSON fragments
    let cleaned = content.replace(/[,\]\}]["'\s]*$/, '');
    
    // Remove any leading JSON fragments  
    cleaned = cleaned.replace(/^[{\[]["'\s]*/, '');
    
    // Remove any escaped quotes that might appear in malformed JSON
    cleaned = cleaned.replace(/\\"/g, '"');
    
    return cleaned.trim();
  };

  // Save notes to blueprint context with debouncing
  const saveToBlueprint = useCallback((newState: ScratchpadState) => {
    if (!isInitialized) return;
    
    // Clear existing timeout
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    const timer = setTimeout(() => {
      // Convert notes array to JSON string for storage
      const notesJson = JSON.stringify(newState.notes);
      updateNotes(notesJson);
    }, 500); // 500ms debounce
    
    setSaveTimer(timer);
  }, [saveTimer, updateNotes, isInitialized]);

  // Update state and trigger save
  const updateState = useCallback((updater: (prev: ScratchpadState) => ScratchpadState) => {
    setLocalState(prev => {
      const newState = updater(prev);
      saveToBlueprint(newState);
      return newState;
    });
  }, [saveToBlueprint]);

  const createDefaultNote = useCallback(() => {
    const defaultNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: 'Show Notes',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalState(prev => ({
      ...prev,
      notes: [defaultNote],
      activeNoteId: defaultNote.id
    }));
    setIsInitialized(true);
  }, []);

  const createNote = useCallback(() => {
    const newNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: `Note ${localState.notes.length + 1}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      activeNoteId: newNote.id
    }));
  }, [localState.notes.length, updateState]);

  const selectNote = useCallback((noteId: string) => {
    updateState(prev => ({
      ...prev,
      activeNoteId: noteId
    }));
  }, [updateState]);

  const updateNoteContent = useCallback((content: string) => {
    if (!localState.activeNoteId) return;

    updateState(prev => ({
      ...prev,
      notes: prev.notes.map(note => {
        if (note.id === localState.activeNoteId) {
          // More conservative auto-renaming - only for completely empty titles or exact default titles
          const shouldAutoUpdateTitle = !manuallyRenamedNotes.has(note.id) && 
            (note.title === '' || note.title === 'Show Notes' || note.title.match(/^Note \d+$/));
          
          // Extract title more carefully
          let newTitle = note.title;
          if (shouldAutoUpdateTitle) {
            const extractedTitle = extractTitleFromContent(content);
            // Only update if we got a meaningful title and it's different
            if (extractedTitle && extractedTitle.length > 2 && extractedTitle !== note.title) {
              newTitle = extractedTitle;
            }
          }
          
          return {
            ...note,
            content: cleanupMalformedJson(content),
            title: newTitle,
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      })
    }));
  }, [localState.activeNoteId, updateState, manuallyRenamedNotes]);

  const renameNote = useCallback((noteId: string, newTitle: string) => {
    // Mark this note as manually renamed
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.add(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    updateState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? {
              ...note,
              title: newTitle,
              updatedAt: new Date().toISOString()
            }
          : note
      )
    }));
  }, [updateState, manuallyRenamedNotes]);

  const deleteNote = useCallback((noteId: string) => {
    // Remove from manually renamed notes if it exists
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.delete(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    updateState(prev => {
      const newNotes = prev.notes.filter(note => note.id !== noteId);
      const newActiveId = prev.activeNoteId === noteId 
        ? (newNotes[0]?.id || null)
        : prev.activeNoteId;

      return {
        ...prev,
        notes: newNotes,
        activeNoteId: newActiveId
      };
    });
  }, [updateState, manuallyRenamedNotes]);

  const setSearchQuery = useCallback((query: string) => {
    setLocalState(prev => ({
      ...prev,
      searchQuery: query
    }));
  }, []);

  // Helper function to extract title from HTML content
  const extractTitleFromContent = (htmlContent: string) => {
    if (!htmlContent || htmlContent.trim() === '') return null;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Get first line, but be more conservative
    const firstLine = textContent.split('\n')[0].trim();
    
    // Don't extract titles that are too short, too long, or contain suspicious patterns
    if (firstLine.length < 3 || firstLine.length > 50 || 
        firstLine.includes('{') || firstLine.includes('}') ||
        firstLine.includes('"') || firstLine.includes('[')) {
      return null;
    }
    
    return firstLine;
  };

  const activeNote = localState.notes.find(note => note.id === localState.activeNoteId);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  // Reorder notes function
  const reorderNotes = useCallback((startIndex: number, endIndex: number) => {
    updateState(prev => {
      const newNotes = Array.from(prev.notes);
      const [reorderedItem] = newNotes.splice(startIndex, 1);
      newNotes.splice(endIndex, 0, reorderedItem);
      
      return {
        ...prev,
        notes: newNotes
      };
    });
  }, [updateState]);

  return {
    notes: localState.notes,
    activeNote,
    searchQuery: localState.searchQuery,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    setSearchQuery,
    reorderNotes
  };
};
