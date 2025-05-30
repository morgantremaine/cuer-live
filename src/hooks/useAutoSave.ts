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
  
  const lastSavedDataRef = useRef<{ items: RundownItem[], title: string } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const currentlySavingRef = useRef(false);

  // Find current rundown
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  console.log('AutoSave render:', {
    rundownId,
    isNewRundown,
    itemsCount: items.length,
    title: rundownTitle,
    hasUnsavedChanges,
    isSaving,
    initialized: isInitializedRef.current,
    currentlySaving: currentlySavingRef.current
  });

  // Initialize the baseline when component mounts
  useEffect(() => {
    if (loading || isInitializedRef.current) return;
    
    console.log('Initializing auto-save baseline...');
    
    if (currentRundown && !isNewRundown) {
      lastSavedDataRef.current = {
        items: currentRundown.items || [],
        title: currentRundown.title || 'Untitled Rundown'
      };
      console.log('Initialized with existing rundown:', currentRundown.id);
    } else {
      lastSavedDataRef.current = null;
      console.log('Initialized for new rundown');
    }
    
    isInitializedRef.current = true;
    setHasUnsavedChanges(false);
  }, [currentRundown, isNewRundown, loading]);

  // Check for changes and mark as unsaved
  useEffect(() => {
    if (!isInitializedRef.current || currentlySavingRef.current) return;

    const currentData = { items, title: rundownTitle };
    
    // Compare with last saved data
    const hasChanges = lastSavedDataRef.current === null || 
      JSON.stringify(lastSavedDataRef.current) !== JSON.stringify(currentData);
    
    console.log('Checking for changes:', {
      hasChanges,
      lastSaved: lastSavedDataRef.current,
      current: currentData
    });
    
    if (hasChanges && !hasUnsavedChanges) {
      console.log('Changes detected - marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, hasUnsavedChanges]);

  // Auto-save when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitializedRef.current || currentlySavingRef.current) {
      return;
    }

    console.log('Scheduling auto-save...');
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule save after 2 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      console.log('Auto-save timeout triggered');
      await performSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges]);

  const performSave = async () => {
    if (currentlySavingRef.current) {
      console.log('Save already in progress, skipping...');
      return;
    }

    try {
      console.log('Starting save operation...');
      currentlySavingRef.current = true;
      setIsSaving(true);
      
      const dataToSave = { items, title: rundownTitle };
      
      if (isNewRundown) {
        console.log('Saving new rundown...');
        const result = await saveRundown(rundownTitle, items);
        
        if (result?.id) {
          console.log('New rundown saved with ID:', result.id);
          lastSavedDataRef.current = dataToSave;
          setHasUnsavedChanges(false);
          navigate(`/rundown/${result.id}`, { replace: true });
        } else {
          throw new Error('Failed to save new rundown');
        }
      } else if (rundownId) {
        console.log('Updating existing rundown:', rundownId);
        await updateRundown(rundownId, rundownTitle, items, true);
        console.log('Rundown updated successfully');
        lastSavedDataRef.current = dataToSave;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Save failed:', error);
      // Keep unsaved state on error
    } finally {
      currentlySavingRef.current = false;
      setIsSaving(false);
    }
  };

  const markAsChanged = useCallback(() => {
    console.log('Manually marking as changed');
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [hasUnsavedChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    markAsChanged
  };
};
