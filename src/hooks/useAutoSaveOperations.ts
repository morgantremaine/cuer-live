
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
  
  // Improved ID validation - ensure we don't treat "new" as a valid UUID
  const rundownId = (!rawId || rawId === 'new' || rawId === ':id' || rawId.trim() === '') ? undefined : rawId;
  
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
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
        // Create a new rundown object without an ID (let database generate it)
        const newRundown = {
          id: '', // This will be ignored in the mapper
          user_id: user.id,
          title: rundownTitle,
          items,
          columns,
          timezone,
          start_time: startTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false
        };
        
        const savedId = await saveRundown(newRundown);
        
        if (savedId) {
          navigate(`/rundown/${savedId}`, { replace: true });
          return true;
        } else {
          throw new Error('Failed to save new rundown - no ID returned');
        }
      } else if (rundownId) {
        // Ensure timezone and startTime are properly passed - don't default to undefined
        const saveTimezone = timezone || undefined;
        const saveStartTime = startTime || undefined;
        
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, saveTimezone, saveStartTime);
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
  }, [isSaving, user, isNewRundown, rundownId, saveRundown, updateRundown, navigate]);

  return {
    isSaving,
    performSave,
    isNewRundown
  };
};
