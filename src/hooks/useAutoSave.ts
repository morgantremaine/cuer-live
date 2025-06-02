
import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (
  items: RundownItem[],
  title: string,
  columns: Column[],
  timezone: string,
  startTime: string,
  icon?: string
) => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const { performSave, performUpdate } = useAutoSaveOperations();
  const { hasUnsavedChanges, markAsSaved, isSaving, setIsSaving } = useChangeTracking();
  
  // Track the last saved state to prevent unnecessary saves
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a stable save function using useCallback
  const saveRundown = useCallback(async () => {
    if (isSaving) return;

    // Create current state hash to avoid duplicate saves
    const currentStateHash = JSON.stringify({ items, title, columns, timezone, startTime, icon });
    if (currentStateHash === lastSavedStateRef.current) {
      return;
    }

    console.log('AutoSave: Starting save operation', { rundownId, title, itemsCount: items.length, timezone, startTime, icon });
    
    setIsSaving(true);
    
    try {
      if (rundownId) {
        await performUpdate(rundownId, title, items, true, false, columns, timezone, startTime, icon);
      } else {
        await performSave(title, items, columns, timezone, startTime, icon);
      }
      
      lastSavedStateRef.current = currentStateHash;
      markAsSaved();
      console.log('AutoSave: Save completed successfully');
    } catch (error) {
      console.error('AutoSave: Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [items, title, columns, timezone, startTime, icon, rundownId, isSaving, performSave, performUpdate, markAsSaved, setIsSaving]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveRundown();
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, title, columns, timezone, startTime, icon, hasUnsavedChanges, isSaving, saveRundown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving
  };
};
