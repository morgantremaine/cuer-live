
import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

// Global tracker for recent auto-save operations - increased window
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
  const saveInProgressRef = useRef(false);

  const isNewRundown = !rundownId;

  // Function to check if a rundown was recently auto-saved - increased window
  const wasRecentlyAutoSaved = useCallback((id: string) => {
    const saveTime = recentAutoSaves.get(id);
    if (!saveTime) return false;
    
    // Increased window to 10 seconds to reduce conflicts
    const isRecent = Date.now() - saveTime < 10000;
    return isRecent;
  }, []);

  // Function to check if user has made changes since auto-save
  const hasUserChangedSinceAutoSave = useCallback((id: string) => {
    const userActionTime = userActionsAfterAutoSave.get(id);
    const autoSaveTime = recentAutoSaves.get(id);
    
    if (!userActionTime || !autoSaveTime) return false;
    
    const hasChanged = userActionTime > autoSaveTime;
    return hasChanged;
  }, []);

  // Function to mark user action after auto-save
  const markUserAction = useCallback((id: string) => {
    if (id) {
      userActionsAfterAutoSave.set(id, Date.now());
    }
  }, []);

  const performSave = useCallback(async (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
    // Prevent concurrent saves
    if (isSaving || saveInProgressRef.current) {
      return false;
    }

    if (!user) {
      return false;
    }

    // Validate data before saving - reduced logging
    if (!rundownTitle || rundownTitle.trim() === '') {
      return false;
    }

    if (!Array.isArray(items)) {
      return false;
    }

    try {
      setIsSaving(true);
      saveInProgressRef.current = true;
      const saveStartTime = Date.now();
      lastSaveTimeRef.current = saveStartTime;
      
      if (isNewRundown) {
        const result = await saveRundown(rundownTitle, items, columns, timezone, startTime);
        
        if (result?.id) {
          recentAutoSaves.set(result.id, saveStartTime);
          navigate(`/rundown/${result.id}`, { replace: true });
          return true;
        } else {
          return false;
        }
      } else if (rundownId) {
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, startTime, undefined, undoHistory);
        recentAutoSaves.set(rundownId, saveStartTime);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
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

// Export functions to check states globally - increased timeouts
export const checkRecentAutoSave = (rundownId: string): boolean => {
  const saveTime = recentAutoSaves.get(rundownId);
  if (!saveTime) return false;
  
  const isRecent = Date.now() - saveTime < 10000; // Increased to 10 seconds
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
