import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, savedRundowns } = useRundownStorage();
  
  // Keep track of initial state to compare against
  const initialStateRef = useRef<{ items: RundownItem[], title: string } | null>(null);
  const lastSavedStateRef = useRef<{ items: RundownItem[], title: string } | null>(null);

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canAutoSave = rundownId && currentRundown;

  // Initialize the refs when we first load a rundown
  useEffect(() => {
    if (currentRundown && !initialStateRef.current) {
      const initialState = { items: currentRundown.items, title: currentRundown.title };
      initialStateRef.current = initialState;
      lastSavedStateRef.current = initialState;
      setHasUnsavedChanges(false);
      console.log('Initialized auto-save with:', initialState);
    }
  }, [currentRundown]);

  // Simple change detection - mark as changed when items or title change
  useEffect(() => {
    if (canAutoSave && lastSavedStateRef.current) {
      const currentState = JSON.stringify({ items, title: rundownTitle });
      const savedState = JSON.stringify(lastSavedStateRef.current);
      
      if (currentState !== savedState) {
        console.log('Changes detected, marking as unsaved');
        setHasUnsavedChanges(true);
      }
    }
  }, [items, rundownTitle, canAutoSave]);

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
              lastSavedStateRef.current = { items: [...items], title: rundownTitle };
              setHasUnsavedChanges(false);
              console.log('Auto-save successful');
            } catch (error) {
              console.error('Auto-save failed:', error);
              // Keep unsaved changes flag true if save failed
            }
          }
        }, 3000); // 3 second debounce
      };
    })(),
    [canAutoSave, rundownTitle, items, updateRundown, rundownId, hasUnsavedChanges]
  );

  // Trigger auto-save when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && canAutoSave) {
      debouncedSave();
    }
  }, [hasUnsavedChanges, debouncedSave, canAutoSave]);

  const markAsChanged = useCallback(() => {
    if (canAutoSave) {
      console.log('Manually marking as changed');
      setHasUnsavedChanges(true);
    }
  }, [canAutoSave]);

  const manualSave = useCallback(async () => {
    if (canAutoSave) {
      try {
        console.log('Manual save triggered');
        await updateRundown(rundownId!, rundownTitle, items, false); // silent = false for manual save
        lastSavedStateRef.current = { items: [...items], title: rundownTitle };
        setHasUnsavedChanges(false);
        console.log('Manual save successful');
        return true;
      } catch (error) {
        console.error('Manual save failed:', error);
        return false;
      }
    }
    return true;
  }, [canAutoSave, rundownId, rundownTitle, items, updateRundown]);

  return {
    hasUnsavedChanges: canAutoSave ? hasUnsavedChanges : false,
    markAsChanged,
    manualSave
  };
};
