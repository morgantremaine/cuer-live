
import { useState, useEffect, useCallback } from 'react';
import { ScratchpadNote, ScratchpadState } from '@/types/scratchpad';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useScratchpadNotes = (rundownId: string) => {
  const { updateNotes } = useBlueprintContext();
  const [state, setState] = useState<ScratchpadState>({
    notes: [],
    activeNoteId: null,
    searchQuery: ''
  });

  // Auto-save debounce timer
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(`scratchpad-notes-${rundownId}`);
    if (savedNotes) {
      try {
        const parsedState = JSON.parse(savedNotes);
        setState(prev => ({
          ...prev,
          notes: parsedState.notes || [],
          activeNoteId: parsedState.activeNoteId || null
        }));
      } catch (error) {
        console.error('Error loading scratchpad notes:', error);
        createDefaultNote();
      }
    } else {
      createDefaultNote();
    }
  }, [rundownId]);

  // Save notes to localStorage with debouncing
  const saveToStorage = useCallback((newState: ScratchpadState) => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    const timer = setTimeout(() => {
      localStorage.setItem(`scratchpad-notes-${rundownId}`, JSON.stringify({
        notes: newState.notes,
        activeNoteId: newState.activeNoteId
      }));
      
      // Update blueprint context with active note content for backward compatibility
      const activeNote = newState.notes.find(note => note.id === newState.activeNoteId);
      if (activeNote) {
        updateNotes(activeNote.content);
      }
    }, 500); // 500ms debounce
    
    setSaveTimer(timer);
  }, [saveTimer, rundownId, updateNotes]);

  // Update state and trigger save
  const updateState = useCallback((updater: (prev: ScratchpadState) => ScratchpadState) => {
    setState(prev => {
      const newState = updater(prev);
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const createDefaultNote = useCallback(() => {
    const defaultNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: 'Show Notes',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      notes: [defaultNote],
      activeNoteId: defaultNote.id
    }));
  }, []);

  const createNote = useCallback(() => {
    const newNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: `Note ${state.notes.length + 1}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      activeNoteId: newNote.id
    }));
  }, [state.notes.length, updateState]);

  const selectNote = useCallback((noteId: string) => {
    updateState(prev => ({
      ...prev,
      activeNoteId: noteId
    }));
  }, [updateState]);

  const updateNoteContent = useCallback((content: string) => {
    if (!state.activeNoteId) return;

    updateState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === state.activeNoteId
          ? {
              ...note,
              content,
              title: extractTitleFromContent(content) || note.title,
              updatedAt: new Date().toISOString()
            }
          : note
      )
    }));
  }, [state.activeNoteId, updateState]);

  const renameNote = useCallback((noteId: string, newTitle: string) => {
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
  }, [updateState]);

  const deleteNote = useCallback((noteId: string) => {
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
  }, [updateState]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
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

  const activeNote = state.notes.find(note => note.id === state.activeNoteId);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  return {
    notes: state.notes,
    activeNote,
    searchQuery: state.searchQuery,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    setSearchQuery
  };
};
