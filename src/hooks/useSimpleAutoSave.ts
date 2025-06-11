
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export const useSimpleAutoSave = (
  rundownId: string | undefined,
  items: RundownItem[],
  title: string,
  columns: Column[],
  timezone: string,
  startTime: string,
  saveStateOnSave?: (items: RundownItem[], columns: Column[], title: string, description: string) => void
) => {
  const { user } = useAuth();
  const { updateRundown, saveRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveDataRef = useRef<string>('');
  const isSavingRef = useRef(false);

  const performSave = useCallback(async () => {
    if (!user || isSavingRef.current) return false;

    isSavingRef.current = true;
    console.log('💾 Auto-save triggered for rundown:', rundownId);

    try {
      if (rundownId) {
        // Update existing rundown
        await updateRundown(
          rundownId,
          title,
          items,
          true, // silent
          false, // not archived
          columns,
          timezone,
          startTime
        );
        
        console.log('✅ Auto-save successful');
      } else {
        // Create new rundown
        const newRundown = {
          id: '',
          title,
          items,
          columns,
          timezone,
          start_time: startTime,
          user_id: '',
          team_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false,
          icon: null,
          visibility: 'private' as const,
          undo_history: [],
          teams: null,
          creator_profile: null
        };

        const newId = await saveRundown(newRundown);
        console.log('💾 Created new rundown:', newId);
      }

      return true;
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [user, rundownId, updateRundown, saveRundown, title, items, columns, timezone, startTime]);

  // Auto-save effect - increased delay to reduce frequency
  useEffect(() => {
    const currentData = JSON.stringify({ items, title, columns, timezone, startTime });
    
    // Skip if data hasn't changed
    if (lastSaveDataRef.current === currentData) {
      return;
    }

    lastSaveDataRef.current = currentData;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout with longer delay
    saveTimeoutRef.current = setTimeout(() => {
      if (!isSavingRef.current) {
        performSave();
      }
    }, 5000); // Increased from 2000 to 5000ms

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, title, columns, timezone, startTime, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges: false, // For now, we'll assume auto-save handles this
    isSaving: isSavingRef.current
  };
};
