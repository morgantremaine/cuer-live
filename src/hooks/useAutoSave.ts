
import { useState, useEffect, useRef } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useRundownStorage } from './useRundownStorage';
import { useToast } from './use-toast';

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
  const { toast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to prevent excessive API calls
    saveTimeoutRef.current = setTimeout(async () => {
      const currentDataSignature = JSON.stringify({ items, rundownTitle, columns, timezone, startTime });
      
      // Don't save if data hasn't actually changed
      if (lastSaveDataRef.current === currentDataSignature) {
        return;
      }

      setIsSaving(true);
      
      try {
        if (rundownId) {
          console.log('Auto-saving existing rundown:', rundownId);
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
          console.log('Auto-saving new rundown');
          await saveRundown(rundownTitle, items, columns, timezone, startTime);
        }

        // Update timestamp and mark as saved
        const now = new Date().toISOString();
        setLastSavedTimestamp(now);
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
        lastSaveDataRef.current = currentDataSignature;
        
        console.log('Auto-save completed at:', now);
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show toast for auto-save failures to avoid spam
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, items, rundownTitle, columns, timezone, startTime, rundownId, isSaving]);

  // Initialize timestamp when rundown is loaded
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
