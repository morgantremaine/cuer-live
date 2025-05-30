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
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  const performSave = useCallback(async () => {
    // Prevent saving if already in progress
    if (isSaving) {
      console.log('Auto-save: Save already in progress, skipping');
      return;
    }

    // Validate title
    const trimmedTitle = rundownTitle.trim();
    if (!trimmedTitle) {
      console.log('Auto-save: No title provided, clearing unsaved changes flag');
      setHasUnsavedChanges(false);
      return;
    }

    console.log('Auto-save: Starting save operation', {
      isNewRundown,
      rundownId,
      title: trimmedTitle,
      itemsCount: items.length
    });

    setIsSaving(true);

    try {
      if (isNewRundown) {
        // Save new rundown
        const result = await saveRundown(trimmedTitle, items, columns);
        console.log('Auto-save: New rundown saved:', result);
        
        if (result?.id) {
          // Navigate to the new rundown
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (currentRundown) {
        // Update existing rundown
        await updateRundown(rundownId!, trimmedTitle, items, true, columns);
        console.log('Auto-save: Existing rundown updated');
      } else {
        console.log('Auto-save: Cannot save - rundown not found');
        setHasUnsavedChanges(false);
        return;
      }

      // Mark as saved
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('Auto-save: Save completed successfully');

    } catch (error) {
      console.error('Auto-save: Save failed:', error);
      // Keep the unsaved changes flag on error
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [isNewRundown, rundownId, rundownTitle, items, columns, currentRundown, updateRundown, saveRundown, navigate, isSaving]);

  const markAsChanged = useCallback(() => {
    // Create a data signature to avoid unnecessary saves
    const currentDataSignature = JSON.stringify({ title: rundownTitle, items, columns });
    
    // Only mark as changed if data actually changed
    if (currentDataSignature === lastSaveDataRef.current) {
      return;
    }

    console.log('Auto-save: Data changed, marking as unsaved');
    setHasUnsavedChanges(true);
    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new save timeout (2 seconds debounce)
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2000);
  }, [rundownTitle, items, columns, performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Reset saving state if it gets stuck (safety mechanism)
  useEffect(() => {
    if (isSaving) {
      const resetTimeout = setTimeout(() => {
        console.log('Auto-save: Force resetting stuck saving state');
        setIsSaving(false);
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(resetTimeout);
    }
  }, [isSaving]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
  };
};
