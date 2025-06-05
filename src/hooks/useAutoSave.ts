
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const { isSaving, performSave } = useAutoSaveOperations();
  
  const baselineRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Create a stable signature for change detection
  const createSignature = useCallback(() => {
    if (!items || !Array.isArray(items)) return '';
    
    return JSON.stringify({
      title: rundownTitle || '',
      itemsCount: items.length,
      timezone: timezone || '',
      startTime: startTime || '',
      // Include actual item data for real change detection
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        duration: item.duration,
        type: item.type
      }))
    });
  }, [items, rundownTitle, timezone, startTime]);

  // Initialize baseline only once when we have valid data
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && rundownTitle.trim() && user) {
      const signature = createSignature();
      baselineRef.current = signature;
      isInitializedRef.current = true;
      console.log('Auto-save: Initialized baseline');
    }
  }, [items.length, rundownTitle, user, createSignature]);

  // Auto-save when changes are detected
  useEffect(() => {
    // Don't auto-save if not initialized or if already saving
    if (!isInitializedRef.current || isSaving || !user || !rundownTitle.trim() || items.length === 0) {
      return;
    }

    const currentSignature = createSignature();
    const hasChanges = baselineRef.current !== currentSignature;
    
    if (hasChanges) {
      console.log('Auto-save: Changes detected, scheduling save');
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule the save with debounce
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('Auto-save: Executing save');
          const success = await performSave(items, rundownTitle, columns, timezone, startTime);
          
          if (success) {
            // Update baseline only after successful save
            baselineRef.current = currentSignature;
            console.log('Auto-save: Save completed successfully');
          } else {
            console.error('Auto-save: Save failed');
          }
        } catch (error) {
          console.error('Auto-save: Save error:', error);
        }
      }, 2000);
    }

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [createSignature, isSaving, user, rundownTitle, items.length, performSave, columns, timezone, startTime]);

  // Manual save function
  const triggerSave = useCallback(async () => {
    if (!user || isSaving || !rundownTitle.trim() || items.length === 0) {
      return false;
    }
    
    try {
      const success = await performSave(items, rundownTitle, columns, timezone, startTime);
      if (success) {
        baselineRef.current = createSignature();
        console.log('Manual save: Completed successfully');
      }
      return success;
    } catch (error) {
      console.error('Manual save: Error:', error);
      return false;
    }
  }, [user, isSaving, performSave, items, rundownTitle, columns, timezone, startTime, createSignature]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = isInitializedRef.current && baselineRef.current !== createSignature();

  return {
    hasUnsavedChanges,
    isSaving,
    triggerSave
  };
};
