
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
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  }, []);

  const performAutoSave = useCallback(async () => {
    if (isSaving) {
      console.log('Auto-save: Already saving, skipping...');
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

      if (!titleRef.current || titleRef.current.trim() === '') {
        console.error('Auto-save: Invalid title, skipping');
        return;
      }

      if (!itemsRef.current || itemsRef.current.length === 0) {
        console.log('Auto-save: No items to save, skipping');
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
        return;
      }
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('Auto-save: Successful');
    } catch (error) {
      console.error('Auto-save: Failed:', error);
      // Don't throw error for auto-save, just log it
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, updateRundown, saveRundown, canSave, navigate, isNewRundown, isSaving]);

  // Set up auto-save interval (10 seconds)
  useEffect(() => {
    console.log('Auto-save: Setting up 10-second auto-save interval');
    
    // Clear any existing interval
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    // Set up new interval
    autoSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isSaving) {
        console.log('Auto-save: Triggered by 10-second interval');
        performAutoSave();
      }
    }, 10000); // 10 seconds

    // Cleanup on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [hasUnsavedChanges, isSaving, performAutoSave]);

  // Auto-save when data changes (with debounce)
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      console.log('Auto-save: Data changed, will save in next interval');
    }
  }, [items, rundownTitle, columns, hasUnsavedChanges, isSaving]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
    // Remove manual save function since we're doing auto-save only
  };
};
