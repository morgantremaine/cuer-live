
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown } = useRundownStorage();

  // Debounced auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (rundownId && hasUnsavedChanges) {
            console.log('Auto-saving rundown...');
            await updateRundown(rundownId, rundownTitle, items);
            setHasUnsavedChanges(false);
          }
        }, 2000); // 2 second debounce
      };
    })(),
    [rundownId, rundownTitle, items, hasUnsavedChanges, updateRundown]
  );

  // Track changes to items and trigger auto-save
  useEffect(() => {
    if (rundownId) {
      setHasUnsavedChanges(true);
      debouncedSave();
    }
  }, [items, rundownTitle, debouncedSave, rundownId]);

  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  return {
    hasUnsavedChanges,
    markAsChanged
  };
};
