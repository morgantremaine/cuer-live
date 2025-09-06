import { useState, useCallback, useEffect, useRef } from 'react';
import { useNotesSync } from './useNotesSync';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastChanged: number;
}

const initialState: NotesState = {
  notes: [],
  activeNoteId: null,
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  lastChanged: 0
};

export const useBulletproofNotesState = (rundownId: string | null) => {
  const [state, setState] = useState<NotesState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [manuallyRenamedNotes, setManuallyRenamedNotes] = useState<Set<string>>(new Set());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef(false);

  // Enhanced data sync with conflict resolution
  const {
    syncWithServer,
    saveToServer,
    trackOfflineChange,
    forceFocusCheck,
    isConnected,
    connectionType,
    hasOfflineChanges,
    isSyncing
  } = useNotesSync(
    rundownId,
    state,
    (newStateData) => {
      setState(prev => ({
        ...prev,
        ...newStateData,
        hasUnsavedChanges: false
      }));
    },
    (mergedData) => {
      console.log('🔀 Notes conflict resolved with merged data');
    }
  );

  // Auto-save with offline queueing and better debouncing
  const autoSave = useCallback(async () => {
    if (!isInitialized || !state.hasUnsavedChanges) return;

    console.log('📝 Auto-saving notes data...');
    setState(prev => ({ ...prev, isSaving: true }));
    
    const success = await saveToServer();
    
    setState(prev => ({
      ...prev,
      isSaving: false,
      hasUnsavedChanges: success ? false : prev.hasUnsavedChanges
    }));

    if (success) {
      console.log('✅ Notes auto-save completed successfully');
    } else {
      console.log('❌ Notes auto-save failed - will retry with offline queue');
    }
  }, [isInitialized, state.hasUnsavedChanges, saveToServer]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(autoSave, 1000); // Faster save for notes
  }, [autoSave]);

  // Mark state as changed
  const markChanged = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasUnsavedChanges: true,
      lastChanged: Date.now()
    }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Helper to clean up malformed JSON content
  const cleanupMalformedJson = useCallback((content: string): string => {
    if (!content) return '';
    
    let cleaned = content.replace(/[,\]\}]["'\s]*$/, '');
    cleaned = cleaned.replace(/^[{\[]["'\s]*/, '');
    cleaned = cleaned.replace(/\\"/g, '"');
    
    return cleaned.trim();
  }, []);

  // Helper to extract title from HTML content
  const extractTitleFromContent = useCallback((htmlContent: string) => {
    if (!htmlContent || htmlContent.trim() === '') return null;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    const firstLine = textContent.split('\n')[0].trim();
    
    if (firstLine.length < 3 || firstLine.length > 50 || 
        firstLine.includes('{') || firstLine.includes('}') ||
        firstLine.includes('"') || firstLine.includes('[')) {
      return null;
    }
    
    return firstLine;
  }, []);

  // Initialize notes data
  const initializeNotes = useCallback(async () => {
    if (initializationRef.current || !rundownId) return;
    initializationRef.current = true;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Sync with server to get latest data
      await syncWithServer(true);
      
      // Ensure we have at least one note
      setState(prev => {
        if (prev.notes.length === 0) {
          const defaultNote: Note = {
            id: `note-${Date.now()}`,
            title: 'Notes',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          return {
            ...prev,
            notes: [defaultNote],
            activeNoteId: defaultNote.id
          };
        }
        
        // Set active note if none selected
        if (!prev.activeNoteId && prev.notes.length > 0) {
          return {
            ...prev,
            activeNoteId: prev.notes[0].id
          };
        }
        
        return prev;
      });
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize notes:', error);
      // Create default note on error
      const defaultNote: Note = {
        id: `note-${Date.now()}`,
        title: 'Notes',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        notes: [defaultNote],
        activeNoteId: defaultNote.id,
        isLoading: false
      }));
      setIsInitialized(true);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      initializationRef.current = false;
    }
  }, [rundownId, syncWithServer]);

  // Initialize on mount
  useEffect(() => {
    initializeNotes();
  }, [initializeNotes]);

  // Update note content
  const updateNoteContent = useCallback((content: string) => {
    if (!state.activeNoteId) return;

    setState(prev => {
      const updated = prev.notes.map(note => {
        if (note.id === state.activeNoteId) {
          const shouldAutoUpdateTitle = !manuallyRenamedNotes.has(note.id) && 
            (note.title === '' || note.title === 'Notes' || note.title.match(/^Note \d+$/));
          
          let newTitle = note.title;
          if (shouldAutoUpdateTitle) {
            const extractedTitle = extractTitleFromContent(content);
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
      
      // Track the change
      trackOfflineChange(`note-${state.activeNoteId}-content`, content);
      
      return {
        ...prev,
        notes: updated,
        hasUnsavedChanges: true,
        lastChanged: Date.now()
      };
    });
    
    triggerAutoSave();
  }, [state.activeNoteId, manuallyRenamedNotes, extractTitleFromContent, cleanupMalformedJson, trackOfflineChange, triggerAutoSave]);

  // Create new note
  const createNote = useCallback(() => {
    const newNote: Note = {
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
      hasUnsavedChanges: true,
      lastChanged: Date.now()
    }));
    
    trackOfflineChange('notes-create', newNote);
    triggerAutoSave();
  }, [state.notes.length, trackOfflineChange, triggerAutoSave]);

  // Select note
  const selectNote = useCallback((noteId: string) => {
    setState(prev => ({ ...prev, activeNoteId: noteId }));
  }, []);

  // Rename note
  const renameNote = useCallback((noteId: string, newTitle: string) => {
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.add(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    setState(prev => {
      const updated = prev.notes.map(note =>
        note.id === noteId
          ? { ...note, title: newTitle, updatedAt: new Date().toISOString() }
          : note
      );
      
      trackOfflineChange(`note-${noteId}-title`, newTitle);
      
      return {
        ...prev,
        notes: updated,
        hasUnsavedChanges: true,
        lastChanged: Date.now()
      };
    });
    
    triggerAutoSave();
  }, [manuallyRenamedNotes, trackOfflineChange, triggerAutoSave]);

  // Delete note
  const deleteNote = useCallback((noteId: string) => {
    const newManuallyRenamed = new Set(manuallyRenamedNotes);
    newManuallyRenamed.delete(noteId);
    setManuallyRenamedNotes(newManuallyRenamed);

    setState(prev => {
      const updated = prev.notes.filter(note => note.id !== noteId);
      let newActiveNoteId = prev.activeNoteId;
      
      if (prev.activeNoteId === noteId && updated.length > 0) {
        newActiveNoteId = updated[0].id;
      }
      
      trackOfflineChange(`note-${noteId}-delete`, true);
      
      return {
        ...prev,
        notes: updated,
        activeNoteId: newActiveNoteId,
        hasUnsavedChanges: true,
        lastChanged: Date.now()
      };
    });
    
    triggerAutoSave();
  }, [manuallyRenamedNotes, trackOfflineChange, triggerAutoSave]);

  // Reorder notes
  const reorderNotes = useCallback((startIndex: number, endIndex: number) => {
    setState(prev => {
      const newNotes = Array.from(prev.notes);
      const [reorderedItem] = newNotes.splice(startIndex, 1);
      newNotes.splice(endIndex, 0, reorderedItem);
      
      trackOfflineChange('notes-reorder', { startIndex, endIndex });
      
      return {
        ...prev,
        notes: newNotes,
        hasUnsavedChanges: true,
        lastChanged: Date.now()
      };
    });
    
    triggerAutoSave();
  }, [trackOfflineChange, triggerAutoSave]);

  // Enhanced focus check with conflict resolution
  const handleTabFocus = useCallback(() => {
    if (isInitialized && isConnected) {
      console.log('👁️ Notes tab focused - checking for updates...');
      forceFocusCheck();
    }
  }, [isInitialized, isConnected, forceFocusCheck]);

  // Set up focus listeners
  useEffect(() => {
    window.addEventListener('focus', handleTabFocus);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleTabFocus();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleTabFocus]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const activeNote = state.notes.find(note => note.id === state.activeNoteId) || null;

  return {
    // Core state
    notes: state.notes,
    activeNote,
    activeNoteId: state.activeNoteId,
    
    // Status
    isLoading: state.isLoading,
    isInitialized,
    isSaving: state.isSaving || isSyncing,
    hasUnsavedChanges: state.hasUnsavedChanges,
    
    // Network and sync status
    isConnected,
    connectionType,
    hasOfflineChanges,
    
    // Actions
    createNote,
    selectNote,
    updateNoteContent,
    renameNote,
    deleteNote,
    reorderNotes,
    markChanged,
    forceFocusCheck,
    
    // Manual sync control
    syncNow: () => syncWithServer(true),
    saveNow: autoSave,
    triggerAutoSave
  };
};