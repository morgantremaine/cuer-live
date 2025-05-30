
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
  const [currentRundownId, setCurrentRundownId] = useState(rundownId);
  
  const { saveRundown, updateRundown } = useRundownStorage();
  const { toast } = useToast();
  
  // Keep track of the last saved state to detect changes
  const lastSavedState = useRef<{
    items: string;
    title: string;
    columns: string;
  } | null>(null);
  
  const hasDataChanged = useCallback(() => {
    if (!lastSavedState.current || !isDataLoaded) {
      console.log('🔍 AutoSave: No baseline state or data not loaded');
      return false;
    }
    
    const currentState = {
      items: JSON.stringify(items),
      title: rundownTitle,
      columns: JSON.stringify(columns)
    };
    
    const changed = (
      currentState.items !== lastSavedState.current.items ||
      currentState.title !== lastSavedState.current.title ||
      currentState.columns !== lastSavedState.current.columns
    );
    
    if (changed) {
      console.log('📝 AutoSave: Data has changed', {
        itemsChanged: currentState.items !== lastSavedState.current.items,
        titleChanged: currentState.title !== lastSavedState.current.title,
        columnsChanged: currentState.columns !== lastSavedState.current.columns
      });
    }
    
    return changed;
  }, [items, rundownTitle, columns, isDataLoaded]);

  const performSave = useCallback(async (silent = true) => {
    if (!isDataLoaded || isSaving) {
      console.log('🚫 AutoSave: Skipping save - data not loaded or already saving');
      return;
    }

    console.log('💾 AutoSave: Starting save process', {
      rundownId: currentRundownId,
      isNewRundown: currentRundownId === 'new' || !currentRundownId,
      itemsCount: items.length,
      title: rundownTitle,
      columnsCount: columns.length
    });

    setIsSaving(true);
    
    try {
      let finalRundownId = currentRundownId;
      
      if (!currentRundownId || currentRundownId === 'new') {
        // Create new rundown
        console.log('💾 AutoSave: Creating new rundown');
        const newRundown = await saveRundown(rundownTitle, items, columns);
        if (newRundown?.id) {
          finalRundownId = newRundown.id;
          setCurrentRundownId(newRundown.id);
          console.log('💾 AutoSave: New rundown created with ID:', newRundown.id);
          // Update the URL without reloading the page
          window.history.replaceState({}, '', `/rundown/${newRundown.id}`);
        }
      } else {
        // Update existing rundown
        console.log('💾 AutoSave: Updating existing rundown');
        await updateRundown(currentRundownId, rundownTitle, items, silent, columns);
      }
      
      // Update our tracking state with stringified versions for comparison
      lastSavedState.current = {
        items: JSON.stringify(items),
        title: rundownTitle,
        columns: JSON.stringify(columns)
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
  }, [currentRundownId, items, rundownTitle, columns, isDataLoaded, isSaving, saveRundown, updateRundown, toast]);

  // Mark data as changed when any of the tracked values change
  useEffect(() => {
    if (!isDataLoaded) return;
    
    if (hasDataChanged()) {
      console.log('📝 AutoSave: Data changed detected, marking as unsaved');
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, columns, isDataLoaded, hasDataChanged]);

  // Auto-save every 10 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isDataLoaded) return;

    console.log('⏰ AutoSave: Setting up 10-second auto-save timer');
    const timer = setTimeout(() => {
      console.log('⏰ AutoSave: Timer triggered, performing auto-save');
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
        items: JSON.stringify(items),
        title: rundownTitle,
        columns: JSON.stringify(columns)
      };
      // For existing rundowns, we start with no unsaved changes
      // For new rundowns, we want to save them once they have content
      if (currentRundownId === 'new' && (items.length > 0 || rundownTitle.trim())) {
        setHasUnsavedChanges(true);
      }
    }
  }, [isDataLoaded, items, rundownTitle, columns, currentRundownId]);

  // Update current rundown ID when prop changes
  useEffect(() => {
    if (rundownId !== currentRundownId) {
      console.log('🔄 AutoSave: Rundown ID changed, updating state', { from: currentRundownId, to: rundownId });
      setCurrentRundownId(rundownId);
      // Reset saved state when switching rundowns
      lastSavedState.current = null;
      setHasUnsavedChanges(false);
    }
  }, [rundownId, currentRundownId]);

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
