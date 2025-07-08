import { useState, useEffect, useCallback } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useUnifiedNotes = (rundownId: string) => {
  const { state, updateNotes } = useBlueprintContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track manually renamed notes
  const [manuallyRenamedNotes, setManuallyRenamedNotes] = useState<Set<string>>(new Set());

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

  // Initialize notes from blueprint context (single source of truth)
  useEffect(() => {
    if (isInitialized) return;
    
    try {
      let parsedNotes: Note[] = [];
      
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
              content: typeof note.content === 'string' ? cleanupMalformedJson(note.content) : ''
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
              title: 'Notes',
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
            title: 'Notes', 
            content: cleanContent,
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
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing unified notes:', error);
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
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [state.notes, isInitialized]);

  // Save notes to blueprint context (unified save)
  const saveNotes = useCallback((notesToSave: Note[]) => {
    if (!isInitialized) return;
    
    try {
      const notesJson = JSON.stringify(notesToSave);
      updateNotes(notesJson);
    } catch (error) {
      console.error('Error saving unified notes:', error);
    }
  }, [updateNotes, isInitialized]);

  // Update note content
  const updateNoteContent = useCallback((content: string) => {
    if (!activeNoteId) return;

    setNotes(prev => {
      const updated = prev.map(note => {
        if (note.id === activeNoteId) {
          // More conservative auto-renaming - only for completely empty titles or exact default titles
          const shouldAutoUpdateTitle = !manuallyRenamedNotes.has(note.id) && 
            (note.title === '' || note.title === 'Notes' || note.title.match(/^Note \d+$/));
          
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
      });
      
      saveNotes(updated);
      return updated;
    });
  }, [activeNoteId, saveNotes, manuallyRenamedNotes]);

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
    // Mark this note as manually renamed
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.add(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    setNotes(prev => {
      const updated = prev.map(note =>
        note.id === noteId
          ? { ...note, title: newTitle, updatedAt: new Date().toISOString() }
          : note
      );
      saveNotes(updated);
      return updated;
    });
  }, [saveNotes, manuallyRenamedNotes]);

  // Delete note
  const deleteNote = useCallback((noteId: string) => {
    // Remove from manually renamed notes if it exists
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.delete(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    setNotes(prev => {
      const updated = prev.filter(note => note.id !== noteId);
      // If we deleted the active note, select the first remaining one
      if (activeNoteId === noteId && updated.length > 0) {
        setActiveNoteId(updated[0].id);
      }
      saveNotes(updated);
      return updated;
    });
  }, [activeNoteId, saveNotes, manuallyRenamedNotes]);

  // Reorder notes
  const reorderNotes = useCallback((startIndex: number, endIndex: number) => {
    setNotes(prev => {
      const newNotes = Array.from(prev);
      const [reorderedItem] = newNotes.splice(startIndex, 1);
      newNotes.splice(endIndex, 0, reorderedItem);
      saveNotes(newNotes);
      return newNotes;
    });
  }, [saveNotes]);

  const activeNote = notes.find(note => note.id === activeNoteId) || null;

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