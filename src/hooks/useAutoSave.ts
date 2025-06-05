
import { useEffect, useRef, useState } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

interface UseAutoSaveProps {
  rundownId?: string;
  rundownTitle: string;
  items: RundownItem[];
  columns: Column[];
  timezone: string;
  rundownStartTime: string;
  hasUnsavedChanges: boolean;
  markAsSaved: (items: RundownItem[], title: string, columns?: Column[], timezone?: string, startTime?: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAutoSave = ({
  rundownId,
  rundownTitle,
  items,
  columns,
  timezone,
  rundownStartTime,
  hasUnsavedChanges,
  markAsSaved,
  setIsLoading
}: UseAutoSaveProps) => {
  const { saveRundown, updateRundown } = useRundownStorage();
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  // Auto-save when changes are detected
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    // Create a signature to prevent unnecessary saves
    const currentSignature = JSON.stringify({ 
      title: rundownTitle, 
      itemsLength: items.length, 
      columnsLength: columns.length,
      timezone,
      startTime: rundownStartTime
    });

    if (lastSaveRef.current === currentSignature) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set up auto-save with debounce
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        setIsLoading(true);
        
        console.log('Auto-saving rundown...', { rundownId, title: rundownTitle });

        if (rundownId) {
          // Update existing rundown
          await updateRundown(
            rundownId,
            rundownTitle,
            items,
            true, // silent save
            false, // not archived
            columns,
            timezone,
            rundownStartTime
          );
        } else {
          // Save new rundown
          const savedData = await saveRundown(
            rundownTitle,
            items,
            columns,
            timezone,
            rundownStartTime
          );
          
          if (savedData) {
            // Update URL to reflect the new rundown ID
            window.history.replaceState({}, '', `/rundown/${savedData.id}`);
          }
        }

        lastSaveRef.current = currentSignature;
        markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);
        
        console.log('Auto-save completed successfully');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
        setIsLoading(false);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, rundownId, rundownTitle, items, columns, timezone, rundownStartTime, isSaving, saveRundown, updateRundown, markAsSaved, setIsLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return { isSaving };
};
