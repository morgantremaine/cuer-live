import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();
  
  // Keep track of last saved state
  const lastSavedStateRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canAutoSave = rundownId && currentRundown;
  const isNewRundown = !rundownId;

  // Initialize the state when we first load
  useEffect(() => {
    if (!isInitializedRef.current) {
      const currentState = JSON.stringify({ items, title: rundownTitle, columns: columns || [] });
      lastSavedStateRef.current = currentState;
      setHasUnsavedChanges(false);
      isInitializedRef.current = true;
      console.log('Auto-save: Initialized');
    }
  }, [items, rundownTitle, columns]);

  // Simple change detection
  useEffect(() => {
    if (isInitializedRef.current) {
      const currentState = JSON.stringify({ items, title: rundownTitle, columns: columns || [] });
      
      if (currentState !== lastSavedStateRef.current) {
        console.log('Auto-save: Changes detected');
        setHasUnsavedChanges(true);
      }
    }
  }, [items, rundownTitle, columns]);

  // Debounced auto-save functionality
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (hasUnsavedChanges && isInitializedRef.current) {
            console.log('Auto-save: Starting auto-save...');
            try {
              if (isNewRundown) {
                console.log('Auto-save: Saving new rundown');
                const result = await saveRundown(rundownTitle, items, columns);
                if (result?.id) {
                  navigate(`/rundown/${result.id}`, { replace: true });
                }
              } else if (canAutoSave) {
                console.log('Auto-save: Updating existing rundown');
                await updateRundown(rundownId!, rundownTitle, items, true, columns);
              }
              
              const newSavedState = JSON.stringify({ items, title: rundownTitle, columns: columns || [] });
              lastSavedStateRef.current = newSavedState;
              setHasUnsavedChanges(false);
              console.log('Auto-save: Successful');
            } catch (error) {
              console.error('Auto-save: Failed:', error);
            }
          }
        }, 2000); // 2 second debounce
      };
    })(),
    [hasUnsavedChanges, rundownTitle, items, columns, updateRundown, saveRundown, rundownId, canAutoSave, navigate, isNewRundown]
  );

  // Trigger auto-save when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && isInitializedRef.current) {
      console.log('Auto-save: Triggering auto-save due to changes');
      debouncedSave();
    }
  }, [hasUnsavedChanges, debouncedSave]);

  const markAsChanged = useCallback(() => {
    console.log('Auto-save: Manually marking as changed');
    setHasUnsavedChanges(true);
  }, []);

  const manualSave = useCallback(async () => {
    try {
      console.log('Auto-save: Manual save triggered');
      if (isNewRundown) {
        console.log('Auto-save: Manually saving new rundown');
        const result = await saveRundown(rundownTitle, items, columns);
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (canAutoSave) {
        await updateRundown(rundownId!, rundownTitle, items, false, columns);
      }
      
      const newSavedState = JSON.stringify({ items, title: rundownTitle, columns: columns || [] });
      lastSavedStateRef.current = newSavedState;
      setHasUnsavedChanges(false);
      console.log('Auto-save: Manual save successful');
      return true;
    } catch (error) {
      console.error('Auto-save: Manual save failed:', error);
      return false;
    }
  }, [rundownId, rundownTitle, items, columns, updateRundown, saveRundown, canAutoSave, navigate, isNewRundown]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    manualSave
  };
};
