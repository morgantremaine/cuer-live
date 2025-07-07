import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useFloatingNotes = (rundownId: string) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load notes from blueprint
  const loadNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('notes')
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (error) {
        console.error('Error loading notes:', error);
        return;
      }

      let parsedNotes: Note[] = [];
      
      if (data?.notes) {
        try {
          // Try to parse as JSON array first
          const parsed = JSON.parse(data.notes);
          if (Array.isArray(parsed)) {
            parsedNotes = parsed;
          } else {
            // Convert old text format to new format
            parsedNotes = [{
              id: `note-${Date.now()}`,
              title: 'Notes',
              content: data.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
          }
        } catch {
          // Handle plain text format
          parsedNotes = [{
            id: `note-${Date.now()}`,
            title: 'Notes',
            content: data.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }];
        }
      }

      // Ensure we have at least one note
      if (parsedNotes.length === 0) {
        parsedNotes = [{
          id: `note-${Date.now()}`,
          title: 'Notes',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
      }

      setNotes(parsedNotes);
      setActiveNoteId(parsedNotes[0]?.id || null);
    } catch (error) {
      console.error('Error loading notes:', error);
      // Create default note on error
      const defaultNote = {
        id: `note-${Date.now()}`,
        title: 'Notes',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNotes([defaultNote]);
      setActiveNoteId(defaultNote.id);
    } finally {
      setIsLoading(false);
    }
  }, [rundownId]);

  // Save notes with debouncing
  const saveNotes = useCallback(async (notesToSave: Note[]) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        // First, ensure blueprint record exists
        const { data: existingBlueprint } = await supabase
          .from('blueprints')
          .select('id, rundown_title')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (!existingBlueprint) {
          // Get rundown title for blueprint
          const { data: rundownData } = await supabase
            .from('rundowns')
            .select('title')
            .eq('id', rundownId)
            .single();

          // Create blueprint record
          const { error: createError } = await supabase
            .from('blueprints')
            .insert({
              rundown_id: rundownId,
              rundown_title: rundownData?.title || 'Untitled',
              lists: [],
              notes: JSON.stringify(notesToSave)
            });

          if (createError) {
            console.error('Error creating blueprint:', createError);
          }
        } else {
          // Update existing blueprint
          const { error: updateError } = await supabase
            .from('blueprints')
            .update({
              notes: JSON.stringify(notesToSave),
              updated_at: new Date().toISOString()
            })
            .eq('rundown_id', rundownId);

          if (updateError) {
            console.error('Error saving notes:', updateError);
          }
        }
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    }, 1000);

    setSaveTimeout(timeout);
  }, [rundownId, saveTimeout]);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Update note content
  const updateNoteContent = useCallback((content: string) => {
    if (!activeNoteId) return;

    setNotes(prev => {
      const updated = prev.map(note => 
        note.id === activeNoteId 
          ? { ...note, content, updatedAt: new Date().toISOString() }
          : note
      );
      saveNotes(updated);
      return updated;
    });
  }, [activeNoteId, saveNotes]);

  // Create new note
  const createNote = useCallback(() => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: `Note ${notes.length + 1}`,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes(prev => {
      const updated = [newNote, ...prev];
      saveNotes(updated);
      return updated;
    });
    setActiveNoteId(newNote.id);
  }, [notes.length, saveNotes]);

  // Select note
  const selectNote = useCallback((noteId: string) => {
    setActiveNoteId(noteId);
  }, []);

  // Rename note
  const renameNote = useCallback((noteId: string, newTitle: string) => {
    setNotes(prev => {
      const updated = prev.map(note =>
        note.id === noteId
          ? { ...note, title: newTitle, updatedAt: new Date().toISOString() }
          : note
      );
      saveNotes(updated);
      return updated;
    });
  }, [saveNotes]);

  // Delete note
  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => {
      const updated = prev.filter(note => note.id !== noteId);
      // If we deleted the active note, select the first remaining one
      if (activeNoteId === noteId && updated.length > 0) {
        setActiveNoteId(updated[0].id);
      }
      saveNotes(updated);
      return updated;
    });
  }, [activeNoteId, saveNotes]);

  const activeNote = notes.find(note => note.id === activeNoteId) || null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  return {
    notes,
    activeNote,
    isLoading,
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote
  };
};