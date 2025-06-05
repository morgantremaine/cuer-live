
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const { isSaving, performSave } = useAutoSaveOperations();
  
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Create signature for change detection
  const createSignature = useCallback(() => {
    return JSON.stringify({
      title: rundownTitle || '',
      itemsCount: items.length,
      timezone: timezone || '',
      startTime: startTime || '',
      itemsData: items.map(item => ({ id: item.id, name: item.name, duration: item.duration }))
    });
  }, [items, rundownTitle, timezone, startTime]);

  const currentSignature = createSignature();

  // Initialize baseline once
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && user && rundownTitle.trim()) {
      console.log('Auto-save: Initializing baseline');
      lastSavedDataRef.current = currentSignature;
      isInitializedRef.current = true;
    }
  }, [currentSignature, items.length, user, rundownTitle]);

  // Auto-save when changes detected
  useEffect(() => {
    if (!isInitializedRef.current || isSaving || !user || !rundownTitle.trim()) {
      return;
    }

    const hasChanges = lastSavedDataRef.current !== currentSignature;
    
    if (hasChanges && items.length > 0) {
      console.log('Auto-save: Changes detected, scheduling save');
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule save with debounce
      saveTimeoutRef.current = setTimeout(async () => {
        console.log('Auto-save: Executing save');
        try {
          const success = await performSave(items, rundownTitle, columns, timezone, startTime);
          
          if (success) {
            lastSavedDataRef.current = currentSignature;
            console.log('Auto-save: Save completed successfully');
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
  }, [currentSignature, isSaving, user, rundownTitle, items, columns, timezone, startTime, performSave]);

  const hasUnsavedChanges = isInitializedRef.current && lastSavedDataRef.current !== currentSignature;

  const triggerSave = useCallback(async () => {
    if (!user || isSaving || !rundownTitle.trim()) return false;
    
    try {
      const success = await performSave(items, rundownTitle, columns, timezone, startTime);
      if (success) {
        lastSavedDataRef.current = currentSignature;
        console.log('Manual save: Completed successfully');
      }
      return success;
    } catch (error) {
      console.error('Manual save: Error:', error);
      return false;
    }
  }, [user, isSaving, performSave, items, rundownTitle, columns, timezone, startTime, currentSignature]);

  return {
    hasUnsavedChanges,
    isSaving,
    triggerSave
  };
};
