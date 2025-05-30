
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();

  // Check if the current rundown exists in saved rundowns
  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const canSave = rundownId && currentRundown;
  const isNewRundown = !rundownId;

  const markAsChanged = useCallback(() => {
    console.log('Manual save: Marking as changed');
    setHasUnsavedChanges(true);
  }, []);

  const manualSave = useCallback(async () => {
    try {
      console.log('Manual save: Save triggered', {
        isNewRundown,
        canSave,
        rundownId,
        rundownTitle,
        itemsCount: items.length,
        columnsCount: columns?.length
      });

      if (!rundownTitle || rundownTitle.trim() === '') {
        console.error('Manual save: Invalid title');
        throw new Error('Rundown title is required');
      }

      if (!items || items.length === 0) {
        console.warn('Manual save: No items to save');
      }

      if (isNewRundown) {
        console.log('Manual save: Saving new rundown');
        const result = await saveRundown(rundownTitle, items, columns);
        console.log('Manual save: New rundown saved, result:', result);
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (canSave) {
        console.log('Manual save: Updating existing rundown');
        await updateRundown(rundownId!, rundownTitle, items, false, columns);
        console.log('Manual save: Existing rundown updated');
      } else {
        console.error('Manual save: Cannot save - no valid rundown context');
        throw new Error('Cannot save rundown - invalid context');
      }
      
      setHasUnsavedChanges(false);
      console.log('Manual save: Successful');
      return true;
    } catch (error) {
      console.error('Manual save: Failed:', error);
      throw error; // Re-throw to let the caller handle the error
    }
  }, [rundownId, rundownTitle, items, columns, updateRundown, saveRundown, canSave, navigate, isNewRundown]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    manualSave
  };
};
