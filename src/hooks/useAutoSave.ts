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
    }
  }, [currentRundown]);

  // Check if current state differs from last saved state
  const hasChanges = useCallback(() => {
    if (!lastSavedStateRef.current) return true; // If no saved state, assume changes
    
    const currentState = { items, title: rundownTitle };
    return JSON.stringify(currentState) !== JSON.stringify(lastSavedStateRef.current);
  }, [items, rundownTitle]);

  // Debounced auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (canAutoSave && hasChanges()) {
            console.log('Auto-saving rundown...');
            try {
              await updateRundown(rundownId!, rundownTitle, items, true); // silent = true for auto-save
              lastSavedStateRef.current = { items: [...items], title: rundownTitle };
              setHasUnsavedChanges(false);
            } catch (error) {
              console.error('Auto-save failed:', error);
              // Keep unsaved changes flag true if save failed
            }
          }
        }, 2000); // 2 second debounce
      };
    })(),
    [canAutoSave, rundownTitle, items, updateRundown, rundownId, hasChanges]
  );

  // Track changes to items and title
  useEffect(() => {
    if (canAutoSave && hasChanges()) {
      setHasUnsavedChanges(true);
      debouncedSave();
    } else if (canAutoSave && !hasChanges()) {
      setHasUnsavedChanges(false);
    }
  }, [items, rundownTitle, debouncedSave, canAutoSave, hasChanges]);

  const markAsChanged = useCallback(() => {
    if (canAutoSave) {
      setHasUnsavedChanges(true);
    }
  }, [canAutoSave]);

  const manualSave = useCallback(async () => {
    if (canAutoSave && hasChanges()) {
      try {
        await updateRundown(rundownId!, rundownTitle, items, false); // silent = false for manual save
        lastSavedStateRef.current = { items: [...items], title: rundownTitle };
        setHasUnsavedChanges(false);
        return true;
      } catch (error) {
        console.error('Manual save failed:', error);
        return false;
      }
    }
    return true;
  }, [canAutoSave, rundownId, rundownTitle, items, updateRundown, hasChanges]);

  return {
    hasUnsavedChanges: canAutoSave ? hasUnsavedChanges : false,
    markAsChanged,
    manualSave
  };
};
