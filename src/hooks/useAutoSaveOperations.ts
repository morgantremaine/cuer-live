
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { updateRundown, saveRundown, loadRundowns } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
    if (isSaving) {
      console.log('Save already in progress, skipping');
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
      console.log(`Performing save - isNewRundown: ${isNewRundown}, rundownId: ${rundownId}`);
      
      if (isNewRundown) {
        console.log('Saving new rundown:', { title: rundownTitle, itemsCount: items.length });
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        
        if (result?.id) {
          console.log('New rundown saved successfully with ID:', result.id);
          
          // Force a storage refresh and wait for it
          console.log('Refreshing storage after save...');
          await loadRundowns();
          
          // Add extra time to ensure the refresh propagates
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('Navigating to new rundown:', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          throw new Error('Failed to save new rundown - no ID returned');
        }
      } else if (rundownId) {
        console.log('Updating existing rundown:', rundownId);
        // For existing rundowns, use silent update
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, startTime);
        console.log('Existing rundown updated successfully');
        return true;
      }
      
      console.error('No valid save path found');
      return false;
    } catch (error) {
      console.error('Save failed:', error);
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
