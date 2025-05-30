import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns, loading } = useRundownStorage();
  const navigate = useNavigate();
  
  const lastSavedStateRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Find current rundown
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  console.log('AutoSave state:', {
    rundownId,
    isNewRundown,
    currentRundown: !!currentRundown,
    itemsCount: items.length,
    title: rundownTitle,
    hasUnsavedChanges,
    isSaving,
    storageLoading: loading
  });

  // Initialize the last saved state when we first load
  useEffect(() => {
    if (loading) return; // Wait for storage to load
    
    if (!isInitializedRef.current) {
      console.log('Initializing auto-save...');
      
      if (currentRundown) {
        const initialState = JSON.stringify({ 
          items: currentRundown.items, 
          title: currentRundown.title 
        });
        lastSavedStateRef.current = initialState;
        console.log('Initialized with existing rundown:', currentRundown.id);
      } else if (isNewRundown) {
        lastSavedStateRef.current = null;
        console.log('Initialized for new rundown');
      }
      
      isInitializedRef.current = true;
      setHasUnsavedChanges(false);
    }
  }, [currentRundown, isNewRundown, loading]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (isSavingRef.current) {
      console.log('Already saving, skipping...');
      return;
    }

    try {
      console.log('Starting auto-save...', { isNewRundown, rundownId, itemsCount: items.length });
      
      setIsSaving(true);
      isSavingRef.current = true;
      
      if (isNewRundown) {
        console.log('Saving new rundown...');
        const result = await saveRundown(rundownTitle, items);
        console.log('Save result:', result);
        
        if (result?.id) {
          console.log('Navigating to new rundown:', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
          lastSavedStateRef.current = JSON.stringify({ items, title: rundownTitle });
          setHasUnsavedChanges(false);
        } else {
          throw new Error('No ID returned from save operation');
        }
      } else if (currentRundown && rundownId) {
        console.log('Updating existing rundown:', rundownId);
        await updateRundown(rundownId, rundownTitle, items, true);
        lastSavedStateRef.current = JSON.stringify({ items, title: rundownTitle });
        setHasUnsavedChanges(false);
        console.log('Update successful');
      } else {
        console.error('Cannot save: no current rundown found');
        throw new Error('Current rundown not found');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Keep hasUnsavedChanges true on error
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [isNewRundown, rundownTitle, items, saveRundown, navigate, currentRundown, updateRundown, rundownId]);

  // Check for changes and trigger auto-save
  useEffect(() => {
    if (!isInitializedRef.current || loading) return;

    const currentState = JSON.stringify({ items, title: rundownTitle });
    const hasChanged = lastSavedStateRef.current !== currentState;
    
    console.log('Checking for changes:', {
      hasChanged,
      currentStateLength: currentState.length,
      lastSavedStateLength: lastSavedStateRef.current?.length || 0
    });
    
    if (hasChanged) {
      console.log('Changes detected, marking as unsaved and scheduling save');
      setHasUnsavedChanges(true);
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Schedule auto-save after 2 seconds of no changes
      saveTimeoutRef.current = setTimeout(() => {
        console.log('Auto-save timeout triggered');
        performAutoSave();
      }, 2000);
    }
  }, [items, rundownTitle, performAutoSave, loading]);

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
    isSaving,
    markAsChanged
  };
};
