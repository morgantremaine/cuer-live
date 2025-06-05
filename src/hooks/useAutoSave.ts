
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const { isSaving, performSave } = useAutoSaveOperations();
  
  // Simple state tracking
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  
  // Create state signature for comparison
  const createSignature = useCallback(() => {
    return JSON.stringify({
      title: rundownTitle,
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      timezone: timezone || '',
      startTime: startTime || '',
      // Include first few items to detect content changes
      itemsSnapshot: items.slice(0, 2).map(item => ({
        id: item.id,
        name: item.name || item.segmentName || '',
        type: item.type
      }))
    });
  }, [items, rundownTitle, columns, timezone, startTime]);

  const currentSignature = createSignature();

  // Initialize once when we have data
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0 && user) {
      console.log('Auto-save: Initializing once with data');
      lastSavedStateRef.current = currentSignature;
      isInitializedRef.current = true;
    }
  }, [currentSignature, items.length, user]);

  // Auto-save when changes are detected
  useEffect(() => {
    // Don't save if not initialized or already saving
    if (!isInitializedRef.current || isSaving || !user) {
      return;
    }

    // Check if state has changed
    const hasChanges = lastSavedStateRef.current !== currentSignature;
    
    if (hasChanges && items.length > 0 && rundownTitle.trim()) {
      console.log('Auto-save: Scheduling save for changes');
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('Auto-save: Executing save');
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
      }, 2000); // 2 second debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentSignature, isSaving, user, items, rundownTitle, columns, timezone, startTime, performSave]);

  // Manual save trigger
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

  // Check if we have unsaved changes
  const hasUnsavedChanges = isInitializedRef.current && lastSavedStateRef.current !== currentSignature;

  return {
    hasUnsavedChanges,
    isSaving,
    triggerSave
  };
};
