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
  
  // Keep track of initial state to compare against
  const initialStateRef = useRef<{ items: RundownItem[], title: string, columns?: Column[] } | null>(null);
  const lastSavedStateRef = useRef<{ items: RundownItem[], title: string, columns?: Column[] } | null>(null);
  const isNewRundownRef = useRef<boolean>(!rundownId);
  const isInitializedRef = useRef<boolean>(false);

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canAutoSave = rundownId && currentRundown;
  const isNewRundown = !rundownId;

  // Initialize the refs when we first load a rundown or start a new one
  useEffect(() => {
    if (currentRundown && !isInitializedRef.current) {
      const initialState = { 
        items: currentRundown.items || [], 
        title: currentRundown.title || 'Live Broadcast Rundown',
        columns: currentRundown.column_config || []
      };
      initialStateRef.current = initialState;
      lastSavedStateRef.current = initialState;
      setHasUnsavedChanges(false);
      isNewRundownRef.current = false;
      isInitializedRef.current = true;
      console.log('Auto-save: Initialized with existing rundown:', initialState);
    } else if (isNewRundown && !isInitializedRef.current && items.length > 0) {
      // For new rundowns, set initial state to current state
      const initialState = { items, title: rundownTitle, columns: columns || [] };
      initialStateRef.current = initialState;
      lastSavedStateRef.current = null; // No saved state yet
      setHasUnsavedChanges(false);
      isNewRundownRef.current = true;
      isInitializedRef.current = true;
      console.log('Auto-save: Initialized for new rundown:', initialState);
    }
  }, [currentRundown, isNewRundown, items, rundownTitle, columns]);

  // Change detection for both existing and new rundowns
  useEffect(() => {
    if (isInitializedRef.current && initialStateRef.current) {
      const currentState = JSON.stringify({ items, title: rundownTitle, columns: columns || [] });
      const compareState = lastSavedStateRef.current || initialStateRef.current;
      const savedState = JSON.stringify(compareState);
      
      if (currentState !== savedState) {
        console.log('Auto-save: Changes detected, marking as unsaved');
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
              if (isNewRundownRef.current) {
                // Save as new rundown
                console.log('Auto-save: Saving new rundown to database');
                const result = await saveRundown(rundownTitle, items, columns);
                if (result?.id) {
                  // Navigate to the new rundown URL
                  navigate(`/rundown/${result.id}`, { replace: true });
                  isNewRundownRef.current = false;
                }
              } else if (canAutoSave) {
                // Update existing rundown
                await updateRundown(rundownId!, rundownTitle, items, true, columns); // silent = true for auto-save
              }
              
              lastSavedStateRef.current = { items: [...items], title: rundownTitle, columns: columns ? [...columns] : [] };
              setHasUnsavedChanges(false);
              console.log('Auto-save: Successful');
            } catch (error) {
              console.error('Auto-save: Failed:', error);
              // Keep unsaved changes flag true if save failed
            }
          }
        }, 3000); // 3 second debounce
      };
    })(),
    [hasUnsavedChanges, rundownTitle, items, columns, updateRundown, saveRundown, rundownId, canAutoSave, navigate]
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
      if (isNewRundownRef.current) {
        // Save as new rundown
        console.log('Auto-save: Manually saving new rundown to database');
        const result = await saveRundown(rundownTitle, items, columns);
        if (result?.id) {
          // Navigate to the new rundown URL
          navigate(`/rundown/${result.id}`, { replace: true });
          isNewRundownRef.current = false;
        }
      } else if (canAutoSave) {
        // Update existing rundown
        await updateRundown(rundownId!, rundownTitle, items, false, columns); // silent = false for manual save
      }
      
      lastSavedStateRef.current = { items: [...items], title: rundownTitle, columns: columns ? [...columns] : [] };
      setHasUnsavedChanges(false);
      console.log('Auto-save: Manual save successful');
      return true;
    } catch (error) {
      console.error('Auto-save: Manual save failed:', error);
      return false;
    }
  }, [rundownId, rundownTitle, items, columns, updateRundown, saveRundown, canAutoSave, navigate]);

  return {
    hasUnsavedChanges: hasUnsavedChanges,
    markAsChanged,
    manualSave
  };
};
