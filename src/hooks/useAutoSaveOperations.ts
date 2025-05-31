
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
    if (isSaving) {
      return false;
    }

    if (!user) {
      console.error('Cannot save: user not authenticated');
      return false;
    }

    // Validate data before saving
    if (!rundownTitle || rundownTitle.trim() === '') {
      console.error('Cannot save: title is empty');
      return false;
    }

    if (!Array.isArray(items)) {
      console.error('Cannot save: items is not an array');
      return false;
    }

    try {
      setIsSaving(true);
      
      if (isNewRundown) {
        const result = await saveRundown(rundownTitle, items, columns);
        
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          throw new Error('Failed to save new rundown - no ID returned');
        }
      } else if (rundownId) {
        await updateRundown(rundownId, rundownTitle, items, true, false, columns);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, user, isNewRundown, rundownId, saveRundown, updateRundown, navigate]);

  return {
    isSaving,
    performSave,
    isNewRundown
  };
};
