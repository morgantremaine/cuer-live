
import { useState, useEffect, useCallback } from 'react';
import { ScratchpadNote, ScratchpadState } from '@/types/scratchpad';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

export const useScratchpadNotes = (rundownId: string) => {
  const { updateNotes } = useBlueprintContext();
  const [state, setState] = useState<ScratchpadState>({
    notes: [],
    activeNoteId: null,
    isEditing: false
  });

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(`scratchpad-notes-${rundownId}`);
    if (savedNotes) {
      try {
        const parsedState = JSON.parse(savedNotes);
        setState(parsedState);
      } catch (error) {
        console.error('Error loading scratchpad notes:', error);
        createDefaultNote();
      }
    } else {
      createDefaultNote();
    }
  }, [rundownId]);

  // Save notes to localStorage whenever state changes
  useEffect(() => {
    if (state.notes.length > 0) {
      localStorage.setItem(`scratchpad-notes-${rundownId}`, JSON.stringify(state));
      
      // Also update the blueprint context with the active note content for backward compatibility
      const activeNote = state.notes.find(note => note.id === state.activeNoteId);
      if (activeNote) {
        updateNotes(activeNote.content);
      }
    }
  }, [state, rundownId, updateNotes]);

  const createDefaultNote = useCallback(() => {
    const defaultNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: 'Show Notes',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState({
      notes: [defaultNote],
      activeNoteId: defaultNote.id,
      isEditing: false
    });
  }, []);

  const createNote = useCallback(() => {
    const newNote: ScratchpadNote = {
      id: `note-${Date.now()}`,
      title: `Note ${state.notes.length + 1}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      activeNoteId: newNote.id,
      isEditing: true
    }));
  }, [state.notes.length]);

  const selectNote = useCallback((noteId: string) => {
    setState(prev => ({
      ...prev,
      activeNoteId: noteId,
      isEditing: false
    }));
  }, []);

  const updateNoteContent = useCallback((content: string) => {
    if (!state.activeNoteId) return;

    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === state.activeNoteId
          ? {
              ...note,
              content,
              title: content.split('\n')[0].substring(0, 30) || `Note ${prev.notes.indexOf(note) + 1}`,
              updatedAt: new Date().toISOString()
            }
          : note
      )
    }));
  }, [state.activeNoteId]);

  const deleteNote = useCallback((noteId: string) => {
    setState(prev => {
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
  }, []);

  const toggleEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: !prev.isEditing
    }));
  }, []);

  const activeNote = state.notes.find(note => note.id === state.activeNoteId);

  return {
    notes: state.notes,
    activeNote,
    isEditing: state.isEditing,
    createNote,
    selectNote,
    updateNoteContent,
    deleteNote,
    toggleEditing
  };
};
