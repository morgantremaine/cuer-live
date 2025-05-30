
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, savedRundowns } = useRundownStorage();

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canAutoSave = rundownId && currentRundown;

  // Debounced auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (canAutoSave && hasUnsavedChanges) {
            console.log('Auto-saving rundown...');
            try {
              await updateRundown(rundownId!, rundownTitle, items, true); // silent = true for auto-save
              setHasUnsavedChanges(false);
            } catch (error) {
              console.error('Auto-save failed:', error);
              // Silently fail for auto-save to avoid error spam
            }
          }
        }, 2000); // 2 second debounce
      };
    })(),
    [canAutoSave, rundownTitle, items, hasUnsavedChanges, updateRundown, rundownId]
  );

  // Track changes to items and trigger auto-save
  useEffect(() => {
    if (canAutoSave) {
      setHasUnsavedChanges(true);
      debouncedSave();
    }
  }, [items, rundownTitle, debouncedSave, canAutoSave]);

  const markAsChanged = () => {
    if (canAutoSave) {
      setHasUnsavedChanges(true);
    }
  };

  return {
    hasUnsavedChanges: canAutoSave ? hasUnsavedChanges : false,
    markAsChanged
  };
};
