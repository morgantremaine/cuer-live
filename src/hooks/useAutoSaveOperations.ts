
import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

// Global tracker for recent auto-save operations with extended window
const recentAutoSaves = new Map<string, number>();

// Global tracker for user actions after auto-save
const userActionsAfterAutoSave = new Map<string, number>();

export const useAutoSaveOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { updateRundown, saveRundown } = useRundownStorage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastSaveTimeRef = useRef<number>(0);

  const isNewRundown = !rundownId;

  // Function to check if a rundown was recently auto-saved (extended to 5 seconds)
  const wasRecentlyAutoSaved = useCallback((id: string) => {
    const saveTime = recentAutoSaves.get(id);
    if (!saveTime) return false;
    
    // Extended window to 5 seconds to account for async operations
    const isRecent = Date.now() - saveTime < 5000;
    console.log('Checking if rundown was recently auto-saved:', { id, saveTime, isRecent, timeSince: Date.now() - saveTime });
    return isRecent;
  }, []);

  // Function to check if user has made changes since auto-save
  const hasUserChangedSinceAutoSave = useCallback((id: string) => {
    const userActionTime = userActionsAfterAutoSave.get(id);
    const autoSaveTime = recentAutoSaves.get(id);
    
    if (!userActionTime || !autoSaveTime) return false;
    
    const hasChanged = userActionTime > autoSaveTime;
    console.log('Checking user changes since auto-save:', { id, userActionTime, autoSaveTime, hasChanged });
    return hasChanged;
  }, []);

  // Function to mark user action after auto-save
  const markUserAction = useCallback((id: string) => {
    if (id) {
      userActionsAfterAutoSave.set(id, Date.now());
      console.log('Marked user action for rundown:', id);
    }
  }, []);

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
      title: rundownTitle
    });

    try {
      setIsSaving(true);
      const saveStartTime = Date.now();
      lastSaveTimeRef.current = saveStartTime;
      
      if (isNewRundown) {
        console.log('Auto-save: Creating new rundown');
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        
        if (result?.id) {
          console.log('Auto-save: New rundown created with ID:', result.id);
          // Track this auto-save operation
          recentAutoSaves.set(result.id, saveStartTime);
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          console.error('Auto-save: Failed to save new rundown - no ID returned');
          return false;
        }
      } else if (rundownId) {
        console.log('Auto-save: Updating existing rundown:', rundownId);
        
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, startTime, undefined, undoHistory);
        console.log('Auto-save: Successfully updated rundown');
        
        // Track this auto-save operation
        recentAutoSaves.set(rundownId, saveStartTime);
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
    isNewRundown,
    wasRecentlyAutoSaved,
    hasUserChangedSinceAutoSave,
    markUserAction
  };
};

// Export functions to check states globally
export const checkRecentAutoSave = (rundownId: string): boolean => {
  const saveTime = recentAutoSaves.get(rundownId);
  if (!saveTime) return false;
  
  const isRecent = Date.now() - saveTime < 5000; // Extended to 5 seconds
  return isRecent;
};

export const checkUserChangedSinceAutoSave = (rundownId: string): boolean => {
  const userActionTime = userActionsAfterAutoSave.get(rundownId);
  const autoSaveTime = recentAutoSaves.get(rundownId);
  
  if (!userActionTime || !autoSaveTime) return false;
  return userActionTime > autoSaveTime;
};

export const markGlobalUserAction = (rundownId: string): void => {
  if (rundownId) {
    userActionsAfterAutoSave.set(rundownId, Date.now());
  }
};
