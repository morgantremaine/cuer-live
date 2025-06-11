
import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitializedRef = useRef(false);

  const performSave = useCallback(async () => {
    if (!user || isSavingRef.current) return false;

    isSavingRef.current = true;
    setIsSaving(true);
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

      // Update the saved data reference and clear unsaved changes
      const currentData = JSON.stringify({ items, title, columns, timezone, startTime });
      lastSaveDataRef.current = currentData;
      setHasUnsavedChanges(false);

      return true;
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [user, rundownId, updateRundown, saveRundown, title, items, columns, timezone, startTime]);

  // Auto-save effect - detect changes and schedule saves
  useEffect(() => {
    // Skip initial effect run to avoid saving immediately on load
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const initialData = JSON.stringify({ items, title, columns, timezone, startTime });
      lastSaveDataRef.current = initialData;
      return;
    }

    const currentData = JSON.stringify({ items, title, columns, timezone, startTime });
    
    // Check if data has actually changed
    if (lastSaveDataRef.current !== currentData) {
      console.log('📝 Changes detected, marking as unsaved');
      setHasUnsavedChanges(true);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        if (!isSavingRef.current) {
          performSave();
        }
      }, 3000); // 3 second delay for auto-save
    }

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
    hasUnsavedChanges,
    isSaving
  };
};
