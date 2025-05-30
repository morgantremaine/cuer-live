
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
      console.log('Manual save: Save triggered');
      if (isNewRundown) {
        console.log('Manual save: Saving new rundown');
        const result = await saveRundown(rundownTitle, items, columns);
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (canSave) {
        console.log('Manual save: Updating existing rundown');
        await updateRundown(rundownId!, rundownTitle, items, false, columns);
      }
      
      setHasUnsavedChanges(false);
      console.log('Manual save: Successful');
      return true;
    } catch (error) {
      console.error('Manual save: Failed:', error);
      return false;
    }
  }, [rundownId, rundownTitle, items, columns, updateRundown, saveRundown, canSave, navigate, isNewRundown]);

  return {
    hasUnsavedChanges,
    markAsChanged,
    manualSave
  };
};
