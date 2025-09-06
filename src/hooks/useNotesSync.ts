import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { useOfflineQueue } from './useOfflineQueue';
import { logger } from '@/utils/logger';

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
}

interface SyncResult {
  success: boolean;
  hadConflicts: boolean;
  mergedData?: Partial<NotesState>;
}

export const useNotesSync = (
  rundownId: string | null,
  currentState: NotesState,
  onStateUpdate: (newState: Partial<NotesState>) => void,
  onConflictResolved?: (mergedData: any) => void
) => {
  const { isConnected, connectionType } = useNetworkStatus();
  const {
    queueOperation,
    processQueue,
    recordOfflineChange,
    getOfflineChanges,
    markChangesApplied,
    hasOfflineChanges
  } = useOfflineQueue(rundownId);

  const lastSyncTimeRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);

  // Fetch latest notes data from server
  const fetchLatestData = useCallback(async (): Promise<any | null> => {
    if (!rundownId || !isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('external_notes')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Failed to fetch latest notes data:', error);
        return null;
      }

      return data?.external_notes;
    } catch (error) {
      console.error('Error fetching latest notes data:', error);
      return null;
    }
  }, [rundownId, isConnected]);

  // Parse notes from external_notes field
  const parseNotesData = useCallback((rawNotes: any): Note[] => {
    if (!rawNotes) return [];

    try {
      if (typeof rawNotes === 'string') {
        const parsed = JSON.parse(rawNotes);
        if (Array.isArray(parsed)) {
          return parsed.filter(note => 
            note && 
            typeof note === 'object' && 
            note.id && 
            note.title !== undefined && 
            note.content !== undefined
          );
        }
        return [];
      } else if (Array.isArray(rawNotes)) {
        return rawNotes.filter(note => 
          note && 
          typeof note === 'object' && 
          note.id && 
          note.title !== undefined && 
          note.content !== undefined
        );
      }
    } catch (error) {
      console.error('Error parsing notes data:', error);
    }
    
    return [];
  }, []);

  // Detect conflicts in notes data
  const detectConflicts = useCallback((localState: NotesState, remoteNotes: Note[]): string[] => {
    const conflicts: string[] = [];

    // Check for conflicts in notes array
    const localNotesString = JSON.stringify(localState.notes);
    const remoteNotesString = JSON.stringify(remoteNotes);
    
    if (localNotesString !== remoteNotesString) {
      conflicts.push('notes');
    }

    return conflicts;
  }, []);

  // Resolve conflicts using operational transformation
  const resolveConflicts = useCallback((localState: NotesState, remoteNotes: Note[]): SyncResult => {
    const conflicts = detectConflicts(localState, remoteNotes);
    
    if (conflicts.length === 0) {
      return { success: true, hadConflicts: false };
    }

    console.log('🔄 Resolving notes conflicts:', conflicts);
    
    const mergedData: Partial<NotesState> = {};
    
    // Get offline changes to determine priority
    const offlineChanges = getOfflineChanges();
    const hasLocalChanges = offlineChanges.some(change => change.field?.includes('note'));
    
    if (conflicts.includes('notes')) {
      if (hasLocalChanges) {
        // Prefer local changes if we have recent offline edits
        mergedData.notes = localState.notes;
      } else {
        // Use remote changes and try to preserve active note
        mergedData.notes = remoteNotes;
        // Try to maintain active note if it still exists
        if (localState.activeNoteId) {
          const activeNoteExists = remoteNotes.some(note => note.id === localState.activeNoteId);
          if (!activeNoteExists && remoteNotes.length > 0) {
            mergedData.activeNoteId = remoteNotes[0].id;
          }
        }
      }
    }

    return {
      success: true,
      hadConflicts: true,
      mergedData
    };
  }, [detectConflicts, getOfflineChanges]);

  // Save notes data to server
  const saveToServer = useCallback(async (statesToSave?: NotesState): Promise<boolean> => {
    const saveState = statesToSave || currentState;
    
    if (!rundownId) {
      return false;
    }

    if (!isConnected) {
      // Queue for offline processing
      queueOperation('save', {
        external_notes: JSON.stringify(saveState.notes)
      });
      return true;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const notesJson = JSON.stringify(saveState.notes);
      
      const { error } = await supabase
        .from('rundowns')
        .update({
          external_notes: notesJson,
          last_updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        console.error('❌ Notes save failed:', error);
        return false;
      }

      // Mark offline changes as applied
      markChangesApplied([]);
      lastSyncTimeRef.current = new Date().toISOString();
      
      console.log('✅ Notes saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Notes save error:', error);
      return false;
    }
  }, [rundownId, currentState, isConnected, queueOperation, markChangesApplied]);

  // Sync with server (fetch and resolve conflicts)
  const syncWithServer = useCallback(async (forceSync = false): Promise<SyncResult> => {
    if (syncInProgressRef.current && !forceSync) {
      return { success: false, hadConflicts: false };
    }

    if (!rundownId || !isConnected) {
      return { success: false, hadConflicts: false };
    }

    syncInProgressRef.current = true;

    try {
      const latestData = await fetchLatestData();
      const remoteNotes = parseNotesData(latestData);
      
      const result = resolveConflicts(currentState, remoteNotes);
      
      if (result.hadConflicts && result.mergedData) {
        console.log('🔀 Applying merged notes data');
        onStateUpdate(result.mergedData);
        onConflictResolved?.(result.mergedData);
      } else if (!result.hadConflicts) {
        // No conflicts, apply server state if different
        const hasChanges = JSON.stringify(remoteNotes) !== JSON.stringify(currentState.notes);
        if (hasChanges) {
          onStateUpdate({ notes: remoteNotes });
        }
      }

      lastSyncTimeRef.current = new Date().toISOString();
      return result;
    } catch (error) {
      console.error('❌ Notes sync error:', error);
      return { success: false, hadConflicts: false };
    } finally {
      syncInProgressRef.current = false;
    }
  }, [rundownId, isConnected, currentState, fetchLatestData, parseNotesData, resolveConflicts, onStateUpdate, onConflictResolved]);

  // Track offline changes for conflict resolution
  const trackOfflineChange = useCallback((field: string, value: any) => {
    recordOfflineChange(field, value);
  }, [recordOfflineChange]);

  // Force focus check for tab visibility changes
  const forceFocusCheck = useCallback(async () => {
    if (isConnected) {
      console.log('👁️ Notes focus check - syncing with server');
      await syncWithServer(true);
    }
  }, [isConnected, syncWithServer]);

  // Auto-process queue when connection is restored
  useEffect(() => {
    if (isConnected && hasOfflineChanges) {
      console.log('🔄 Notes connection restored - processing offline queue');
      processQueue();
    }
  }, [isConnected, hasOfflineChanges, processQueue]);

  return {
    syncWithServer,
    saveToServer,
    trackOfflineChange,
    forceFocusCheck,
    isConnected,
    connectionType,
    hasOfflineChanges,
    isSyncing: syncInProgressRef.current
  };
};