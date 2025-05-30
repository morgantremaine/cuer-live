import { useState, useEffect, useCallback, useRef } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useToast } from './use-toast';

interface UseAutoSaveProps {
  rundownId: string;
  items: RundownItem[];
  rundownTitle: string;
  columns: Column[];
  isDataLoaded: boolean;
}

export const useAutoSave = ({
  rundownId,
  items,
  rundownTitle,
  columns,
  isDataLoaded
}: UseAutoSaveProps) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { saveRundown, updateRundown } = useRundownStorage();
  const { toast } = useToast();
  
  // Keep track of the last saved state to detect changes
  const lastSavedState = useRef<{
    items: RundownItem[];
    title: string;
    columns: Column[];
  } | null>(null);
  
  const hasDataChanged = useCallback(() => {
    if (!lastSavedState.current || !isDataLoaded) return false;
    
    const currentState = {
      items: JSON.stringify(items),
      title: rundownTitle,
      columns: JSON.stringify(columns)
    };
    
    const savedState = {
      items: JSON.stringify(lastSavedState.current.items),
      title: lastSavedState.current.title,
      columns: JSON.stringify(lastSavedState.current.columns)
    };
    
    return (
      currentState.items !== savedState.items ||
      currentState.title !== savedState.title ||
      currentState.columns !== savedState.columns
    );
  }, [items, rundownTitle, columns, isDataLoaded]);

  const performSave = useCallback(async (silent = true) => {
    if (!isDataLoaded || isSaving) {
      console.log('🚫 AutoSave: Skipping save - data not loaded or already saving');
      return;
    }

    console.log('💾 AutoSave: Starting save process', {
      rundownId,
      hasRundownId: !!rundownId,
      itemsCount: items.length,
      title: rundownTitle,
      columnsCount: columns.length
    });

    setIsSaving(true);
    
    try {
      if (rundownId && rundownId !== 'new') {
        // Update existing rundown
        console.log('💾 AutoSave: Updating existing rundown');
        await updateRundown(rundownId, rundownTitle, items, silent, columns);
      } else {
        // Create new rundown
        console.log('💾 AutoSave: Creating new rundown');
        const newRundown = await saveRundown(rundownTitle, items, columns);
        if (newRundown) {
          console.log('💾 AutoSave: New rundown created with ID:', newRundown.id);
          // Update the URL without reloading the page
          window.history.replaceState({}, '', `/rundown/${newRundown.id}`);
        }
      }
      
      // Update our tracking state
      lastSavedState.current = {
        items: JSON.parse(JSON.stringify(items)),
        title: rundownTitle,
        columns: JSON.parse(JSON.stringify(columns))
      };
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('✅ AutoSave: Save completed successfully');
      
    } catch (error) {
      console.error('❌ AutoSave: Save failed:', error);
      if (!silent) {
        toast({
          title: 'Save Failed',
          description: 'Failed to save your changes. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, items, rundownTitle, columns, isDataLoaded, isSaving, saveRundown, updateRundown, toast]);

  // Mark data as changed when any of the tracked values change
  useEffect(() => {
    if (!isDataLoaded) return;
    
    if (hasDataChanged()) {
      console.log('📝 AutoSave: Data changed detected');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, isDataLoaded, hasDataChanged]);

  // Auto-save every 10 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isDataLoaded) return;

    console.log('⏰ AutoSave: Setting up 10-second auto-save timer');
    const timer = setTimeout(() => {
      performSave(true);
    }, 10000);

    return () => {
      console.log('⏰ AutoSave: Clearing auto-save timer');
      clearTimeout(timer);
    };
  }, [hasUnsavedChanges, isDataLoaded, performSave]);

  // Initialize the saved state when data is first loaded
  useEffect(() => {
    if (isDataLoaded && !lastSavedState.current) {
      console.log('🔄 AutoSave: Initializing saved state tracking');
      lastSavedState.current = {
        items: JSON.parse(JSON.stringify(items)),
        title: rundownTitle,
        columns: JSON.parse(JSON.stringify(columns))
      };
    }
  }, [isDataLoaded, items, rundownTitle, columns]);

  const manualSave = useCallback(() => {
    console.log('👆 AutoSave: Manual save triggered');
    performSave(false);
  }, [performSave]);

  return {
    hasUnsavedChanges,
    isSaving,
    lastSaved,
    manualSave
  };
};
