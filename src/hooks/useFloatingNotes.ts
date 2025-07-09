import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useFloatingNotes = (rundownId: string) => {
  const { user } = useAuth();
  const { team } = useTeam();
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
            // Validate each note has required fields
            parsedNotes = parsed.filter(note => 
              note && 
              typeof note === 'object' && 
              note.id && 
              note.title !== undefined && 
              note.content !== undefined
            );
          } else if (typeof parsed === 'object' && parsed.content) {
            // Single note object
            parsedNotes = [parsed];
          } else {
            // Treat as plain text
            parsedNotes = [{
              id: `note-${Date.now()}`,
              title: 'Notes',
              content: typeof parsed === 'string' ? parsed : data.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
          }
        } catch {
          // Handle plain text format - clean up any malformed JSON
          let cleanContent = data.notes;
          
          // Remove any trailing JSON fragments
          const jsonPattern = /[,\]\}]["'\s]*$/;
          cleanContent = cleanContent.replace(jsonPattern, '');
          
          // Remove any leading JSON fragments
          const leadingJsonPattern = /^[{\[]["'\s]*/;
          cleanContent = cleanContent.replace(leadingJsonPattern, '');
          
          parsedNotes = [{
            id: `note-${Date.now()}`,
            title: 'Notes',
            content: cleanContent.trim(),
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

          // Create blueprint record following the same pattern as blueprint loading
          const insertData: any = {
            rundown_id: rundownId,
            rundown_title: rundownData?.title || 'Untitled',
            lists: [],
            notes: JSON.stringify(notesToSave)
          };

          // Add user_id and team_id based on team presence
          if (team?.id) {
            insertData.user_id = user?.id;
            insertData.team_id = team.id;
          } else {
            insertData.user_id = user?.id;
            // team_id will be null by default
          }

          const { error: createError } = await supabase
            .from('blueprints')
            .insert(insertData);

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

  const updateNoteContent = useCallback((content: string) => {
    if (!activeNoteId) return;

    setNotes(prev => {
      const updated = prev.map(note => 
        note.id === activeNoteId 
          ? { ...note, content: cleanupMalformedJson(content), updatedAt: new Date().toISOString() }
          : note
      );
      saveNotes(updated);
      return updated;
    });
  }, [activeNoteId, saveNotes]);

  // Reorder notes function
  const reorderNotes = useCallback((startIndex: number, endIndex: number) => {
    setNotes(prev => {
      const newNotes = Array.from(prev);
      const [reorderedItem] = newNotes.splice(startIndex, 1);
      newNotes.splice(endIndex, 0, reorderedItem);
      saveNotes(newNotes);
      return newNotes;
    });
  }, [saveNotes]);

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
    deleteNote,
    reorderNotes
  };
};