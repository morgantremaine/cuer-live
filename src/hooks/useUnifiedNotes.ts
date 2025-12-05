import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeamContext } from '@/contexts/TeamContext';

// Import blueprint context - errors will be handled at runtime
import { useBlueprintContext } from '@/contexts/BlueprintContext';

// Safe wrapper that handles errors
const useBlueprintContextSafe = () => {
  try {
    return useBlueprintContext();
  } catch {
    return null;
  }
};

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useUnifiedNotes = (rundownId: string) => {
  const { user } = useAuth();
  const { team } = useTeamContext();
  const blueprintContext = useBlueprintContextSafe();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
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

  // Initialize notes from either blueprint context or direct database access
  useEffect(() => {
    if (isInitialized) return;
    
    const initializeNotes = async () => {
      try {
        let rawNotes = '';
        
        // Try to get notes from blueprint context first (if available and initialized)
        if (blueprintContext?.state?.notes && blueprintContext.state.isInitialized) {
          rawNotes = blueprintContext.state.notes;
        } else if (blueprintContext?.state?.isInitialized === false) {
          // Blueprint context is available but not initialized yet, wait for it
          return;
        } else {
          // Fall back to direct database access - handle potential duplicates
          const { data, error } = await supabase
            .from('blueprints')
            .select('notes')
            .eq('rundown_id', rundownId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('Error loading notes from database:', error);
          } else {
            rawNotes = data?.notes || '';
          }
        }

        let parsedNotes: Note[] = [];
        
        if (rawNotes && typeof rawNotes === 'string') {
          try {
            const parsed = JSON.parse(rawNotes);
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
              let cleanContent = typeof parsed === 'string' ? parsed : rawNotes;
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
            let cleanContent = cleanupMalformedJson(rawNotes);
            
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
    };

    initializeNotes();
  }, [rundownId, blueprintContext?.state?.notes, blueprintContext?.state?.isInitialized, isInitialized]);

  // Listen for blueprint context updates to sync notes
  useEffect(() => {
    if (!blueprintContext?.state?.isInitialized || !isInitialized) return;
    
    const contextNotes = blueprintContext.state.notes;
    if (contextNotes && typeof contextNotes === 'string') {
      try {
        const parsed = JSON.parse(contextNotes);
        if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(notes)) {
          console.log('📝 Syncing notes from blueprint context');
          setNotes(parsed);
          if (parsed.length > 0 && !activeNoteId) {
            setActiveNoteId(parsed[0].id);
          }
        }
      } catch (error) {
        console.error('Error parsing notes from blueprint context:', error);
      }
    }
  }, [blueprintContext?.state?.notes, blueprintContext?.state?.isInitialized, isInitialized, notes, activeNoteId]);

  // Save notes using appropriate method (context or direct database)
  const saveNotes = useCallback(async (notesToSave: Note[]) => {
    if (!isInitialized) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const notesJson = JSON.stringify(notesToSave);
        
        if (blueprintContext?.updateNotes && blueprintContext.state.isInitialized) {
          // Use blueprint context if available and initialized
          console.log('📝 Saving notes via blueprint context');
          blueprintContext.updateNotes(notesJson);
        } else {
          // Fall back to direct database save - handle potential duplicates
          const { data: existingBlueprint } = await supabase
            .from('blueprints')
            .select('id, rundown_title')
            .eq('rundown_id', rundownId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!existingBlueprint) {
            // Get rundown title for blueprint
            const { data: rundownData } = await supabase
              .from('rundowns')
              .select('title')
              .eq('id', rundownId)
              .maybeSingle();

            // Create blueprint record following the same pattern as blueprint loading
            const insertData: any = {
              rundown_id: rundownId,
              rundown_title: rundownData?.title || 'Untitled',
              lists: [],
              notes: notesJson
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
                notes: notesJson
              })
              .eq('rundown_id', rundownId);

            if (updateError) {
              console.error('Error saving notes:', updateError);
            }
          }
        }
      } catch (error) {
        console.error('Error saving unified notes:', error);
      }
    }, 1000);

    setSaveTimeout(timeout);
  }, [blueprintContext, rundownId, isInitialized, saveTimeout]);

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