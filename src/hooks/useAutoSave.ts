
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
  const isSavingRef = useRef(false);

  // Auto-save with debouncing
  useEffect(() => {
    // Don't save if no changes, already saving, or no meaningful data
    if (!hasUnsavedChanges || isSavingRef.current) {
      return;
    }
    
    // Validate we have saveable data
    if (!rundownTitle || rundownTitle.trim() === '') {
      console.log('Auto-save skipped: No title');
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      console.log('Auto-save skipped: No items');
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to prevent excessive API calls
    saveTimeoutRef.current = setTimeout(async () => {
      const currentDataSignature = JSON.stringify({ items, rundownTitle, columns, timezone, startTime });
      
      // Don't save if data hasn't actually changed since last save
      if (lastSaveDataRef.current === currentDataSignature) {
        console.log('Auto-save skipped: No actual changes');
        return;
      }

      // Prevent concurrent saves
      if (isSavingRef.current) return;
      
      isSavingRef.current = true;
      setIsSaving(true);
      console.log('Auto-saving rundown:', { 
        id: rundownId, 
        title: rundownTitle, 
        itemsCount: items.length 
      });
      
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
          const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
          
          // For new rundowns, we might need to handle the result differently
          if (result?.id) {
            console.log('New rundown created with ID:', result.id);
          }
        }

        // Update timestamp and mark as saved
        const now = new Date().toISOString();
        setLastSavedTimestamp(now);
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
        lastSaveDataRef.current = currentDataSignature;
        
        console.log('Auto-save completed successfully at:', now);
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show toast for auto-save failures to avoid spam
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, items, rundownTitle, columns, timezone, startTime, rundownId]);

  // Initialize timestamp when rundown is loaded
  useEffect(() => {
    if (rundownId && !lastSavedTimestamp) {
      setLastSavedTimestamp(new Date().toISOString());
    }
  }, [rundownId]);

  // Reset saving state when rundown changes
  useEffect(() => {
    isSavingRef.current = false;
    lastSaveDataRef.current = '';
  }, [rundownId]);

  return {
    isSaving,
    lastSavedTimestamp
  };
};
