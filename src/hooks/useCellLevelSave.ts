import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { createContentSignature } from '@/utils/contentSignature';
import { debugLogger } from '@/utils/debugLogger';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';

interface FieldUpdate {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

export const useCellLevelSave = (
  rundownId: string | null,
  onSaveComplete?: (savedUpdates?: FieldUpdate[]) => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  onChangesSaved?: () => void,
  isTypingActive?: () => boolean,
  saveInProgressRef?: React.MutableRefObject<boolean>,
  typingIdleMs?: number
) => {
  const pendingUpdatesRef = useRef<FieldUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const localSaveInProgressRef = useRef(false);

  // Track individual field changes
  const trackCellChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    if (!rundownId) return;

    const update: FieldUpdate = {
      itemId,
      field,
      value,
      timestamp: Date.now()
    };

    pendingUpdatesRef.current.push(update);
    
    console.log('🧪 PER-CELL SAVE: Cell change tracked', {
      rundownId,
      itemId: itemId || 'GLOBAL',
      field,
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      pendingCount: pendingUpdatesRef.current.length,
      timestamp: update.timestamp,
      isGlobalField: !itemId
    });
    
    debugLogger.autosave(`Cell change tracked: ${field} for item ${itemId || 'global'}`);

    // Notify UI that we have unsaved changes 
    // Call this whenever we add changes, not just on the first change
    if (onUnsavedChanges) {
      console.log('🧪 PER-CELL SAVE: Notifying UI of unsaved changes');
      onUnsavedChanges();
    }

    // Typing-aware debounced save - respects typing state and save-in-progress
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🧪 PER-CELL SAVE: Clearing previous save timeout');
    }

    const scheduleTypingAwareSave = () => {
      const delay = typingIdleMs || 1500; // Use same timing as main autosave
      
      saveTimeoutRef.current = setTimeout(() => {
        console.log('🧪 PER-CELL SAVE: Save timeout triggered, checking typing and save state');
        
        // Check if user is still typing or save is in progress
        if (isTypingActive && isTypingActive()) {
          console.log('🧪 PER-CELL SAVE: User still typing, rescheduling save');
          scheduleTypingAwareSave(); // Reschedule
          return;
        }
        
        if (localSaveInProgressRef.current || (saveInProgressRef && saveInProgressRef.current)) {
          console.log('🧪 PER-CELL SAVE: Save in progress, rescheduling save');
          scheduleTypingAwareSave(); // Reschedule
          return;
        }
        
        console.log('🧪 PER-CELL SAVE: Conditions clear, calling savePendingUpdates');
        savePendingUpdates();
      }, delay);
    };

    scheduleTypingAwareSave();
  }, [rundownId]);

  // Save pending updates to database via edge function
  const savePendingUpdates = useCallback(async () => {
    if (!rundownId || pendingUpdatesRef.current.length === 0) {
      console.log('🧪 PER-CELL SAVE: No updates to save', { rundownId, pendingCount: pendingUpdatesRef.current.length });
      return;
    }

    if (localSaveInProgressRef.current || (saveInProgressRef && saveInProgressRef.current)) {
      console.log('🧪 PER-CELL SAVE: Save already in progress, skipping');
      return;
    }

    localSaveInProgressRef.current = true;
    if (saveInProgressRef) {
      saveInProgressRef.current = true;
    }
    const updatesToSave = [...pendingUpdatesRef.current];
    // Don't clear pending updates until save is confirmed successful
    
    console.log('🧪 PER-CELL SAVE: Starting save operation', {
      rundownId,
      updateCount: updatesToSave.length,
      updates: updatesToSave.map(u => ({ itemId: u.itemId, field: u.field, timestamp: u.timestamp }))
    });

    try {
      debugLogger.autosave(`Saving ${updatesToSave.length} cell-level updates`);

      // Notify UI that save is starting
      if (onSaveStart) {
        console.log('🧪 PER-CELL SAVE: Notifying UI that save is starting');
        onSaveStart();
      }

      // Create content signature for change tracking
      const contentSignature = createContentSignature({
        items: [], // Will be computed server-side
        title: '',
        showDate: null,
        externalNotes: ''
      });

      console.log('🧪 PER-CELL SAVE: Invoking edge function', { contentSignature });

      const { data, error } = await supabase.functions.invoke('cell-field-save', {
        body: {
          rundownId,
          fieldUpdates: updatesToSave,
          contentSignature
        }
      });

      if (error) {
        console.error('🚨 PER-CELL SAVE: Edge function error:', error);
        // Put updates back in queue for retry
        pendingUpdatesRef.current.unshift(...updatesToSave);
        throw error;
      }

      if (data?.success) {
        console.log('✅ PER-CELL SAVE: Save successful', {
          fieldsUpdated: data.fieldsUpdated,
          updatedAt: data.updatedAt,
          docVersion: data.docVersion
        });
        debugLogger.autosave(`Cell-level save successful: ${data.fieldsUpdated} fields`);
        
        // Clear pending updates only after successful save
        pendingUpdatesRef.current = [];
        
        // Track own update via centralized tracker with realtime context
        const context = rundownId ? `realtime-${rundownId}` : undefined;
        ownUpdateTracker.track(data.updatedAt, context);
        console.log('🏷️ Tracked own update via centralized tracker:', data.updatedAt);
        
        // Notify that changes have been saved after successful save
        if (onChangesSaved) {
          console.log('🧪 PER-CELL SAVE: Notifying that changes have been saved');
          onChangesSaved();
        }
        
        // Notify the main system that save completed with details
        if (onSaveComplete) {
          console.log('🧪 PER-CELL SAVE: Notifying main system of save completion');
          onSaveComplete(updatesToSave);
        }
        
        return {
          updatedAt: data.updatedAt,
          docVersion: data.docVersion
        };
      } else {
        console.error('🚨 PER-CELL SAVE: Save failed with data:', data);
        throw new Error(data?.error || 'Unknown save error');
      }

    } catch (error) {
      console.error('🚨 PER-CELL SAVE: Exception during save:', error);
      // Don't restore updates to queue - let them try again with next changes
      throw error;
    } finally {
      localSaveInProgressRef.current = false;
      if (saveInProgressRef) {
        saveInProgressRef.current = false;
      }
    }
  }, [rundownId]);

  // Force immediate save of all pending updates
  const flushPendingUpdates = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await savePendingUpdates();
  }, [savePendingUpdates]);

  // Check if there are pending updates
  const hasPendingUpdates = useCallback(() => {
    return pendingUpdatesRef.current.length > 0;
  }, []);

  return {
    trackCellChange,
    flushPendingUpdates,
    hasPendingUpdates
  };
};