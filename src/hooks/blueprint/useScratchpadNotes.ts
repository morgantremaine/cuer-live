
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
            parsedNotes = parsed;
          } else {
            // Handle old text format - convert to new format
            parsedNotes = [{
              id: `note-${Date.now()}`,
              title: 'Show Notes',
              content: state.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
          }
        } catch {
          // Handle old text format - convert to new format
          parsedNotes = [{
            id: `note-${Date.now()}`,
            title: 'Show Notes',
            content: state.notes,
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
          // Only auto-update title if note hasn't been manually renamed AND has no title or default title
          const shouldAutoUpdateTitle = !manuallyRenamedNotes.has(note.id) && 
            (!note.title || note.title.startsWith('Note ') || note.title === 'Show Notes');
          
          return {
            ...note,
            content,
            title: shouldAutoUpdateTitle ? (extractTitleFromContent(content) || note.title) : note.title,
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
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const firstLine = textContent.split('\n')[0].trim();
    return firstLine.substring(0, 30) || null;
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

  return {
    notes: localState.notes,
    activeNote,
    searchQuery: localState.searchQuery,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    setSearchQuery
  };
};
