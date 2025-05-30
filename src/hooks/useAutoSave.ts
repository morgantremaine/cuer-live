import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();
  
  // Keep track of the last saved state
  const lastSavedStateRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  // Initialize the last saved state when we first load
  useEffect(() => {
    if (!isInitializedRef.current) {
      if (currentRundown) {
        // For existing rundowns, set the initial state
        const initialState = JSON.stringify({ 
          items: currentRundown.items, 
          title: currentRundown.title 
        });
        lastSavedStateRef.current = initialState;
        console.log('Initialized auto-save for existing rundown');
      } else if (isNewRundown) {
        // For new rundowns, there's no saved state yet
        lastSavedStateRef.current = null;
        console.log('Initialized auto-save for new rundown');
      }
      isInitializedRef.current = true;
      setHasUnsavedChanges(false);
    }
  }, [currentRundown, isNewRundown]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    try {
      console.log('Performing auto-save...');
      
      if (isNewRundown) {
        // Save as new rundown
        console.log('Saving new rundown to database');
        const result = await saveRundown(rundownTitle, items);
        if (result?.id) {
          // Navigate to the new rundown URL
          navigate(`/rundown/${result.id}`, { replace: true });
          // Update the last saved state
          lastSavedStateRef.current = JSON.stringify({ items, title: rundownTitle });
        }
      } else if (currentRundown) {
        // Update existing rundown
        await updateRundown(rundownId!, rundownTitle, items, true); // silent = true
        // Update the last saved state
        lastSavedStateRef.current = JSON.stringify({ items, title: rundownTitle });
      }
      
      setHasUnsavedChanges(false);
      console.log('Auto-save successful');
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Keep unsaved changes flag true if save failed
    }
  }, [isNewRundown, rundownTitle, items, saveRundown, navigate, currentRundown, updateRundown, rundownId]);

  // Check for changes and trigger auto-save
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const currentState = JSON.stringify({ items, title: rundownTitle });
    
    // Compare with last saved state
    if (lastSavedStateRef.current !== currentState) {
      console.log('Changes detected, scheduling auto-save');
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Schedule auto-save after 2 seconds of no changes
      saveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 2000);
    }
  }, [items, rundownTitle, performAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const markAsChanged = useCallback(() => {
    console.log('Manually marking as changed');
    setHasUnsavedChanges(true);
  }, []);

  return {
    hasUnsavedChanges,
    markAsChanged
  };
};
