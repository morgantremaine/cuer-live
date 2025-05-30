
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
  const isSavingRef = useRef(false);

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

  // Update isSaving ref when state changes
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

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
      isSaving: isSavingRef.current,
      hasTitle: !!titleRef.current,
      titleLength: titleRef.current?.length,
      isNewRundown,
      canSave,
      rundownId,
      itemsCount: itemsRef.current?.length
    });

    // Prevent multiple simultaneous saves using ref
    if (isSavingRef.current) {
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

    console.log('Auto-save: Starting save process');
    
    // Set saving state
    setIsSaving(true);
    isSavingRef.current = true;

    try {
      let result;
      
      if (isNewRundown) {
        console.log('Auto-save: Saving new rundown...');
        result = await saveRundown(titleRef.current, itemsRef.current, columnsRef.current);
        console.log('Auto-save: New rundown saved successfully:', result);
        
        if (result?.id) {
          console.log('Auto-save: Navigating to new rundown URL:', `/rundown/${result.id}`);
          // Use setTimeout to ensure state updates complete before navigation
          setTimeout(() => {
            navigate(`/rundown/${result.id}`, { replace: true });
          }, 100);
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
          currentRundown: !!currentRundown,
          isNewRundown,
          canSave
        });
        // Reset states and exit
        setHasUnsavedChanges(false);
        setIsSaving(false);
        isSavingRef.current = false;
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
      
      // Retry after a delay on error
      setTimeout(() => {
        if (titleRef.current && titleRef.current.trim() !== '') {
          console.log('Auto-save: Retrying after error...');
          performAutoSave();
        }
      }, 5000);
      
    } finally {
      console.log('Auto-save: Resetting isSaving to false');
      setIsSaving(false);
      isSavingRef.current = false;
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

  // Force reset saving state if it gets stuck
  useEffect(() => {
    if (isSaving) {
      const timeout = setTimeout(() => {
        console.log('Auto-save: Force resetting stuck saving state');
        setIsSaving(false);
        isSavingRef.current = false;
      }, 30000); // 30 seconds timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isSaving]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
  };
};
