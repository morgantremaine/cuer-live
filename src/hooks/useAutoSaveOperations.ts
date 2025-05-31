
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, timezone: string) => {
    console.log('🔧 performSave called with:', {
      itemsCount: items.length,
      title: rundownTitle,
      timezone,
      isNewRundown,
      rundownId,
      userId: user?.id || 'none',
      isSaving
    });

    if (isSaving) {
      console.log('Save already in progress, skipping...');
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
      console.log('Starting save operation...', { isNewRundown, itemsCount: items.length, title: rundownTitle, timezone });
      setIsSaving(true);
      
      if (isNewRundown) {
        console.log('Saving new rundown...');
        const result = await saveRundown(rundownTitle, items, timezone);
        console.log('Save result:', result);
        
        if (result?.id) {
          console.log('New rundown saved with ID:', result.id);
          // Use replace: true to avoid navigation issues
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          throw new Error('Failed to save new rundown - no ID returned');
        }
      } else if (rundownId) {
        console.log('Updating existing rundown:', rundownId);
        console.log('Update data:', {
          id: rundownId,
          title: rundownTitle,
          timezone,
          itemsCount: items.length,
          silent: true
        });
        
        // Call updateRundown with proper parameters and error handling
        await updateRundown(rundownId, rundownTitle, items, timezone, true);
        console.log('Rundown updated successfully');
        return true;
      }
      
      console.error('No valid save path found');
      return false;
    } catch (error) {
      console.error('Save failed with detailed error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        rundownId,
        title: rundownTitle,
        timezone,
        itemsCount: items.length,
        isNewRundown
      });
      return false;
    } finally {
      console.log('Save operation completed, setting isSaving to false');
      setIsSaving(false);
    }
  }, [isSaving, user, isNewRundown, rundownId, saveRundown, updateRundown, navigate]);

  return {
    isSaving,
    performSave,
    isNewRundown
  };
};
