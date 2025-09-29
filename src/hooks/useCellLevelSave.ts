import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { createContentSignature } from '@/utils/contentSignature';
import { debugLogger } from '@/utils/debugLogger';

interface FieldUpdate {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

export const useCellLevelSave = (
  rundownId: string | null,
  trackOwnUpdate: (timestamp: string) => void
) => {
  const pendingUpdatesRef = useRef<FieldUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

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
    
    debugLogger.autosave(`Cell change tracked: ${field} for item ${itemId || 'global'}`);

    // Debounce save - trigger after 500ms of no new changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      savePendingUpdates();
    }, 500);
  }, [rundownId]);

  // Save pending updates to database via edge function
  const savePendingUpdates = useCallback(async () => {
    if (!rundownId || pendingUpdatesRef.current.length === 0) {
      return;
    }

    const updatesToSave = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = []; // Clear pending updates

    try {
      debugLogger.autosave(`Saving ${updatesToSave.length} cell-level updates`);

      // Create content signature for change tracking
      const contentSignature = createContentSignature({
        items: [], // Will be computed server-side
        title: '',
        showDate: null,
        externalNotes: ''
      });

      const { data, error } = await supabase.functions.invoke('cell-field-save', {
        body: {
          rundownId,
          fieldUpdates: updatesToSave,
          contentSignature
        }
      });

      if (error) {
        console.error('🚨 Cell-level save failed:', error);
        // Put updates back in queue for retry
        pendingUpdatesRef.current.unshift(...updatesToSave);
        throw error;
      }

      if (data?.success) {
        debugLogger.autosave(`Cell-level save successful: ${data.fieldsUpdated} fields`);
        trackOwnUpdate(data.updatedAt);
        return {
          updatedAt: data.updatedAt,
          docVersion: data.docVersion
        };
      } else {
        throw new Error(data?.error || 'Unknown save error');
      }

    } catch (error) {
      console.error('🚨 Cell-level save error:', error);
      throw error;
    }
  }, [rundownId, trackOwnUpdate]);

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