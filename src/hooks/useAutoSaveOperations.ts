
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { updateRundown, saveRundown, loadRundowns } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
    if (isSaving) {
      console.log('Auto-save: Save already in progress');
      return false;
    }

    if (!user) {
      console.error('Auto-save: No user authenticated');
      return false;
    }

    if (!rundownTitle || rundownTitle.trim() === '') {
      console.error('Auto-save: Empty title');
      return false;
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.log('Auto-save: No items to save');
      return false;
    }

    try {
      setIsSaving(true);
      console.log(`Auto-save: Starting save - isNew: ${isNewRundown}, id: ${rundownId}`);
      
      if (isNewRundown) {
        console.log('Auto-save: Saving new rundown');
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        
        if (result?.id) {
          console.log('Auto-save: New rundown saved, navigating to:', result.id);
          
          // Navigate immediately then refresh storage
          navigate(`/rundown/${result.id}`, { replace: true });
          
          // Refresh storage in background
          setTimeout(() => {
            loadRundowns();
          }, 100);
          
          return true;
        } else {
          throw new Error('Failed to save new rundown');
        }
      } else if (rundownId) {
        console.log('Auto-save: Updating existing rundown');
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, startTime);
        console.log('Auto-save: Existing rundown updated');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Auto-save: Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, user, isNewRundown, rundownId, saveRundown, updateRundown, navigate, loadRundowns]);

  return {
    isSaving,
    performSave,
    isNewRundown
  };
};
