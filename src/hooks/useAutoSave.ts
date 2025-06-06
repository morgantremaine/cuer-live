
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useRundownStorage } from './useRundownStorage';

export const useAutoSave = (
  rundownId: string | undefined,
  hasUnsavedChanges: boolean,
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  startTime: string,
  markAsSaved: (items: RundownItem[], title: string, columns?: Column[], timezone?: string, startTime?: string) => void,
  undoHistory?: any[]
) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const { updateRundown, saveRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only proceed if we have unsaved changes and aren't already saving
    if (!hasUnsavedChanges || isSavingRef.current) {
      return;
    }
    
    // Validate data before saving
    if (!rundownTitle || rundownTitle.trim() === '' || !Array.isArray(items) || items.length === 0) {
      console.log('Auto-save skipped: Invalid data', { title: rundownTitle, itemsLength: items?.length });
      return;
    }

    console.log('Auto-save scheduled for:', rundownTitle, 'with', items.length, 'items');

    // Debounce saves
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      
      isSavingRef.current = true;
      setIsSaving(true);
      console.log('Auto-saving rundown:', { id: rundownId, title: rundownTitle, itemsCount: items.length });
      
      try {
        if (rundownId) {
          await updateRundown(
            rundownId,
            rundownTitle,
            items,
            true, // silent save
            false, // not archived
            columns,
            timezone,
            startTime,
            undefined, // icon
            undoHistory
          );
        } else {
          const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
          if (result?.id) {
            console.log('New rundown created with ID:', result.id);
          }
        }

        const now = new Date().toISOString();
        setLastSavedTimestamp(now);
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
        
        console.log('Auto-save completed successfully');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, items, rundownTitle, columns, timezone, startTime, rundownId]);

  // Initialize timestamp for existing rundowns
  useEffect(() => {
    if (rundownId && !lastSavedTimestamp) {
      setLastSavedTimestamp(new Date().toISOString());
    }
  }, [rundownId]);

  return {
    isSaving,
    lastSavedTimestamp
  };
};
