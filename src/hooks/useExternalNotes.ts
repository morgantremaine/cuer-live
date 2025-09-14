import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const useExternalNotes = (rundownId: string) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const originalNotesRef = useRef<Note[]>([]); // Track originally loaded notes for change detection
  
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

  // Initialize notes from rundown's external_notes field
  useEffect(() => {
    if (isInitialized || !rundownId) return;
    
    const initializeNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('external_notes')
          .eq('id', rundownId)
          .maybeSingle();

        if (error) {
          console.error('Error loading external notes:', error);
        }

        let parsedNotes: Note[] = [];
        const rawNotes = data?.external_notes;
        
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
        } else if (rawNotes && typeof rawNotes === 'object') {
          // Handle case where external_notes is already parsed JSON
          if (Array.isArray(rawNotes)) {
            parsedNotes = rawNotes.filter(note => 
              note && 
              typeof note === 'object' && 
              note.id && 
              note.title !== undefined && 
              note.content !== undefined
            ).map(note => ({
              ...note,
              content: typeof note.content === 'string' ? cleanupMalformedJson(note.content) : ''
            }));
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
        originalNotesRef.current = parsedNotes; // Track original state for change detection
        setActiveNoteId(parsedNotes[0]?.id || null);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing external notes:', error);
        // Create default note on error
        const defaultNote = {
          id: `note-${Date.now()}`,
          title: 'Notes',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setNotes([defaultNote]);
        originalNotesRef.current = [defaultNote]; // Track original state for change detection
        setActiveNoteId(defaultNote.id);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotes();
  }, [rundownId, isInitialized]);

  // Setup realtime sync for external notes
  useEffect(() => {
    if (!rundownId || !user || !isInitialized) return;

    console.log('📝 Setting up external notes realtime sync for rundown:', rundownId);

    const channel = supabase
      .channel(`external-notes-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📝 External notes realtime update received:', {
            updatedByUserId: payload.new?.last_updated_by,
            currentUserId: user?.id,
            timestamp: payload.new?.updated_at
          });

          // Skip if this is our own update
          if (payload.new?.last_updated_by === user?.id) {
            console.log('⏭️ Skipping own external notes update');
            return;
          }

          // Prevent processing duplicate updates
          const updateTimestamp = payload.new?.updated_at;
          if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
            console.log('⏭️ Skipping duplicate external notes update');
            return;
          }
          lastUpdateTimestampRef.current = updateTimestamp;

          // Process remote external notes update
          const rawNotes = payload.new?.external_notes;
          if (rawNotes) {
            console.log('✅ Processing remote external notes update');
            try {
              let parsedNotes: Note[] = [];
              
              if (typeof rawNotes === 'string') {
                const parsed = JSON.parse(rawNotes);
                if (Array.isArray(parsed)) {
                  parsedNotes = parsed.filter(note => 
                    note && typeof note === 'object' && note.id && note.title !== undefined && note.content !== undefined
                  ).map(note => ({
                    ...note,
                    content: typeof note.content === 'string' ? cleanupMalformedJson(note.content) : ''
                  }));
                }
              } else if (typeof rawNotes === 'object' && Array.isArray(rawNotes)) {
                parsedNotes = rawNotes.filter(note => 
                  note && typeof note === 'object' && note.id && note.title !== undefined && note.content !== undefined
                ).map(note => ({
                  ...note,
                  content: typeof note.content === 'string' ? cleanupMalformedJson(note.content) : ''
                }));
              }

              if (parsedNotes.length > 0) {
                setNotes(parsedNotes);
                originalNotesRef.current = parsedNotes; // Track server state for change detection
                // Keep active note if it still exists, otherwise select first
                if (!parsedNotes.find(n => n.id === activeNoteId)) {
                  setActiveNoteId(parsedNotes[0]?.id || null);
                }
                console.log('📝 External notes synced from realtime update');
              }
            } catch (error) {
              console.error('Error processing external notes realtime update:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📝 External notes realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        console.log('🧹 Cleaning up external notes realtime subscription');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [rundownId, user, isInitialized, activeNoteId]);

  // Save notes to rundown's external_notes field
  const saveNotes = useCallback(async (notesToSave: Note[]) => {
    if (!isInitialized || !rundownId) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const notesJson = JSON.stringify(notesToSave);
        
        console.log('📝 Saving external notes to rundown');
        
        // CRITICAL FIX: Only update last_updated_by if notes actually changed from server state, not during initialization
        const updateData: any = { external_notes: notesJson };
        
        // Only attribute the edit to the current user if notes were actually modified
        if (JSON.stringify(notes) !== JSON.stringify(originalNotesRef.current)) {
          updateData.last_updated_by = (await supabase.auth.getUser()).data.user?.id;
        }
        
        const { error } = await supabase
          .from('rundowns')
          .update(updateData)
          .eq('id', rundownId);

        if (error) {
          console.error('Error saving external notes:', error);
        }
      } catch (error) {
        console.error('Error saving external notes:', error);
      }
    }, 1000);

    setSaveTimeout(timeout);
  }, [rundownId, isInitialized, saveTimeout]);

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
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
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
