import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const { isSaving, performSave } = useAutoSaveOperations();
  
  // Track last saved state to prevent unnecessary saves
  const lastSavedStateRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  
  // Create current state signature
  const currentSignature = JSON.stringify({
    itemsCount: items.length,
    title: rundownTitle,
    columnsCount: columns?.length || 0,
    timezone,
    startTime,
    // Only include first few items to keep signature manageable
    itemsSample: items.slice(0, 3).map(item => ({
      id: item.id,
      name: item.segmentName || item.name,
      duration: item.duration
    }))
  });

  // Initialize on first load
  useEffect(() => {
    if (lastSavedStateRef.current === '' && items.length > 0) {
      console.log('Auto-save: Initializing with current state');
      lastSavedStateRef.current = currentSignature;
      hasUnsavedChangesRef.current = false;
    }
  }, [currentSignature, items.length]);

  // Track changes
  useEffect(() => {
    // Skip if not initialized or already saving
    if (lastSavedStateRef.current === '' || isSaving) {
      return;
    }

    // Check if state has actually changed
    const hasChanges = lastSavedStateRef.current !== currentSignature;
    
    if (hasChanges !== hasUnsavedChangesRef.current) {
      hasUnsavedChangesRef.current = hasChanges;
      console.log('Auto-save: Changes detected:', hasChanges);
    }

    // Only auto-save if we have changes and meaningful data
    if (hasChanges && user && items.length > 0 && rundownTitle.trim() !== '') {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce the save operation
      saveTimeoutRef.current = setTimeout(async () => {
        console.log('Auto-save: Executing save operation');
        
        try {
          const success = await performSave(items, rundownTitle, columns, timezone, startTime);
          
          if (success) {
            console.log('Auto-save: Save successful');
            lastSavedStateRef.current = currentSignature;
            hasUnsavedChangesRef.current = false;
          } else {
            console.log('Auto-save: Save failed');
          }
        } catch (error) {
          console.error('Auto-save: Save error:', error);
        }
      }, 2000); // 2 second debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentSignature, user, items, rundownTitle, columns, timezone, startTime, isSaving, performSave]);

  // Mark as changed manually
  const markAsChanged = useCallback(() => {
    console.log('Auto-save: Manually marked as changed');
    hasUnsavedChangesRef.current = true;
  }, []);

  return {
    hasUnsavedChanges: hasUnsavedChangesRef.current,
    isSaving,
    markAsChanged
  };
};
