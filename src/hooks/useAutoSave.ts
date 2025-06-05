
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const { isSaving, performSave } = useAutoSaveOperations();
  
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Create a simple signature for change detection
  const createSignature = useCallback(() => {
    return JSON.stringify({
      title: rundownTitle || '',
      itemsCount: items.length,
      timezone: timezone || '',
      startTime: startTime || '',
      // Just check the first item's basic properties to detect real changes
      firstItemName: items[0]?.name || '',
      lastItemName: items[items.length - 1]?.name || ''
    });
  }, [items, rundownTitle, timezone, startTime]);

  const currentSignature = createSignature();

  // Initialize once when we have meaningful data
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && user && rundownTitle) {
      console.log('Auto-save: Initializing with', items.length, 'items');
      lastSavedStateRef.current = currentSignature;
      isInitializedRef.current = true;
    }
  }, [currentSignature, items.length, user, rundownTitle]);

  // Auto-save when changes are detected
  useEffect(() => {
    if (!isInitializedRef.current || isSaving || !user) {
      return;
    }

    const hasChanges = lastSavedStateRef.current !== currentSignature;
    
    if (hasChanges && items.length > 0 && rundownTitle.trim()) {
      console.log('Auto-save: Changes detected, scheduling save');
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save
      saveTimeoutRef.current = setTimeout(async () => {
        console.log('Auto-save: Executing save operation');
        try {
          const success = await performSave(items, rundownTitle, columns, timezone, startTime);
          
          if (success) {
            lastSavedStateRef.current = currentSignature;
            console.log('Auto-save: Save successful');
          } else {
            console.log('Auto-save: Save failed');
          }
        } catch (error) {
          console.error('Auto-save: Save error:', error);
        }
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentSignature, isSaving, user, items, rundownTitle, columns, timezone, startTime, performSave]);

  // Manual save function
  const triggerSave = useCallback(async () => {
    if (!user || isSaving) return false;
    
    try {
      const success = await performSave(items, rundownTitle, columns, timezone, startTime);
      if (success) {
        lastSavedStateRef.current = currentSignature;
      }
      return success;
    } catch (error) {
      console.error('Manual save error:', error);
      return false;
    }
  }, [user, isSaving, performSave, items, rundownTitle, columns, timezone, startTime, currentSignature]);

  const hasUnsavedChanges = isInitializedRef.current && lastSavedStateRef.current !== currentSignature;

  return {
    hasUnsavedChanges,
    isSaving,
    triggerSave
  };
};
