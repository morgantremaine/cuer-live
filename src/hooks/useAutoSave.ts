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
      if (!isSaving) {
        performAutoSave();
      }
    }, 2000); // 2 second debounce
  }, [isSaving]);

  const performAutoSave = useCallback(async () => {
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('Auto-save: Already saving, skipping...');
      return;
    }

    // Don't save too frequently
    const now = new Date();
    if (lastAutoSaveRef.current && (now.getTime() - lastAutoSaveRef.current.getTime()) < 5000) {
      console.log('Auto-save: Too soon since last save, skipping...');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Auto-save: Starting auto-save', {
        isNewRundown,
        canSave,
        rundownId,
        rundownTitle: titleRef.current,
        itemsCount: itemsRef.current.length,
        columnsCount: columnsRef.current?.length
      });

      // Validate data before saving
      if (!titleRef.current || titleRef.current.trim() === '') {
        console.log('Auto-save: Invalid title, skipping');
        setHasUnsavedChanges(false);
        return;
      }

      if (!itemsRef.current || itemsRef.current.length === 0) {
        console.log('Auto-save: No items to save, skipping');
        setHasUnsavedChanges(false);
        return;
      }

      if (isNewRundown) {
        console.log('Auto-save: Saving new rundown');
        const result = await saveRundown(titleRef.current, itemsRef.current, columnsRef.current);
        console.log('Auto-save: New rundown saved, result:', result);
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (canSave) {
        console.log('Auto-save: Updating existing rundown');
        await updateRundown(rundownId!, titleRef.current, itemsRef.current, true, columnsRef.current);
        console.log('Auto-save: Existing rundown updated');
      } else {
        console.log('Auto-save: Cannot save - no valid rundown context');
        setHasUnsavedChanges(false);
        return;
      }
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      lastAutoSaveRef.current = new Date();
      console.log('Auto-save: Successful');
    } catch (error) {
      console.error('Auto-save: Failed:', error);
      // Reset saving state on error but keep unsaved changes flag
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, updateRundown, saveRundown, canSave, navigate, isNewRundown, isSaving]);

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
