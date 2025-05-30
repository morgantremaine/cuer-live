import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();
  
  // Use refs to track the latest values for auto-save
  const itemsRef = useRef(items);
  const titleRef = useRef(rundownTitle);
  const columnsRef = useRef(columns);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<Date | null>(null);

  // Update refs when values change
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    titleRef.current = rundownTitle;
  }, [rundownTitle]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canSave = rundownId && currentRundown;
  const isNewRundown = !rundownId;

  const markAsChanged = useCallback(() => {
    console.log('Auto-save: Marking as changed');
    setHasUnsavedChanges(true);
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set a new timeout for auto-save (debounced)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000); // 2 second debounce
  }, []);

  const performAutoSave = useCallback(async () => {
    console.log('Auto-save: performAutoSave called', {
      isSaving,
      hasTitle: !!titleRef.current,
      titleLength: titleRef.current?.length,
      isNewRundown,
      canSave,
      rundownId
    });

    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('Auto-save: Already saving, skipping...');
      return;
    }

    // Don't save too frequently
    const now = new Date();
    if (lastAutoSaveRef.current && (now.getTime() - lastAutoSaveRef.current.getTime()) < 3000) {
      console.log('Auto-save: Too soon since last save, skipping...');
      return;
    }

    // Validate we have a title
    if (!titleRef.current || titleRef.current.trim() === '') {
      console.log('Auto-save: No title provided, skipping save');
      setHasUnsavedChanges(false);
      return;
    }

    console.log('Auto-save: Starting save process', {
      isNewRundown,
      canSave,
      rundownId,
      rundownTitle: titleRef.current,
      itemsCount: itemsRef.current.length,
      columnsCount: columnsRef.current?.length
    });

    setIsSaving(true);

    try {
      if (isNewRundown) {
        console.log('Auto-save: Saving new rundown...');
        const result = await saveRundown(titleRef.current, itemsRef.current, columnsRef.current);
        console.log('Auto-save: New rundown saved successfully:', result);
        
        if (result?.id) {
          console.log('Auto-save: Navigating to new rundown URL:', `/rundown/${result.id}`);
          navigate(`/rundown/${result.id}`, { replace: true });
        } else {
          console.error('Auto-save: No ID returned from saveRundown');
          throw new Error('No ID returned from save operation');
        }
      } else if (canSave) {
        console.log('Auto-save: Updating existing rundown...');
        await updateRundown(rundownId!, titleRef.current, itemsRef.current, true, columnsRef.current);
        console.log('Auto-save: Existing rundown updated successfully');
      } else {
        console.log('Auto-save: Cannot save - invalid context', {
          rundownId,
          currentRundown,
          isNewRundown,
          canSave
        });
        setHasUnsavedChanges(false);
        setIsSaving(false);
        return;
      }
      
      // Success - reset all states
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      lastAutoSaveRef.current = new Date();
      console.log('Auto-save: Completed successfully at', new Date().toISOString());
      
    } catch (error) {
      console.error('Auto-save: Save operation failed:', error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Auto-save: Error message:', error.message);
        console.error('Auto-save: Error stack:', error.stack);
      }
      
      // Keep the unsaved changes flag on error
      setHasUnsavedChanges(true);
    } finally {
      console.log('Auto-save: Resetting isSaving to false');
      setIsSaving(false);
    }
  }, [rundownId, updateRundown, saveRundown, canSave, navigate, isNewRundown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
  };
};
