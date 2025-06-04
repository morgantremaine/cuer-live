
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isNewRundown = !rundownId;

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
    if (isSaving) {
      console.log('Auto-save: Already saving, skipping');
      return false;
    }

    if (!user) {
      console.error('Auto-save: Cannot save - user not authenticated');
      return false;
    }

    // Validate data before saving
    if (!rundownTitle || rundownTitle.trim() === '') {
      console.error('Auto-save: Cannot save - title is empty');
      return false;
    }

    if (!Array.isArray(items)) {
      console.error('Auto-save: Cannot save - items is not an array');
      return false;
    }

    console.log('Auto-save: Attempting to save', {
      isNewRundown,
      rundownId,
      itemsCount: items.length,
      title: rundownTitle,
      undoHistoryLength: undoHistory?.length || 0
    });

    try {
      setIsSaving(true);
      
      if (isNewRundown) {
        console.log('Auto-save: Creating new rundown');
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        
        if (result?.id) {
          console.log('Auto-save: New rundown created with ID:', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          console.error('Auto-save: Failed to save new rundown - no ID returned');
          return false;
        }
      } else if (rundownId) {
        console.log('Auto-save: Updating existing rundown:', rundownId);
        
        // Ensure timezone and startTime are properly passed - don't default to undefined
        const saveTimezone = timezone || null;
        const saveStartTime = startTime || null;
        
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, saveTimezone, saveStartTime, undefined, undoHistory);
        console.log('Auto-save: Successfully updated rundown');
        return true;
      }
      
      console.error('Auto-save: No valid save path found');
      return false;
    } catch (error) {
      console.error('Auto-save: Save failed with error:', error);
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
