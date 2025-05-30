
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useSimpleAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');
  const saveInProgressRef = useRef(false);

  console.log('🔄 SimpleAutoSave: Initialized', { rundownId, title: rundownTitle, itemsCount: items.length });

  const performSave = useCallback(async () => {
    if (saveInProgressRef.current) {
      console.log('⚠️ SimpleAutoSave: Save already in progress, skipping');
      return;
    }

    const trimmedTitle = rundownTitle.trim();
    if (!trimmedTitle) {
      console.log('⚠️ SimpleAutoSave: No title provided, skipping save');
      return;
    }

    console.log('🚀 SimpleAutoSave: Starting save...', { rundownId, title: trimmedTitle });
    
    saveInProgressRef.current = true;
    setIsSaving(true);

    try {
      if (!rundownId) {
        // New rundown
        console.log('📝 SimpleAutoSave: Creating new rundown');
        const result = await saveRundown(trimmedTitle, items, columns);
        console.log('✅ SimpleAutoSave: New rundown created', result);
        
        if (result?.id) {
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else {
        // Update existing rundown
        console.log('📝 SimpleAutoSave: Updating existing rundown');
        await updateRundown(rundownId, trimmedTitle, items, true, columns);
        console.log('✅ SimpleAutoSave: Rundown updated successfully');
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('🎉 SimpleAutoSave: Save completed successfully');
      
    } catch (error) {
      console.error('💥 SimpleAutoSave: Save failed', error);
      setHasUnsavedChanges(true);
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [rundownId, rundownTitle, items, columns, saveRundown, updateRundown, navigate]);

  const markAsChanged = useCallback(() => {
    const currentData = JSON.stringify({ title: rundownTitle, items, columns });
    
    if (currentData === lastDataRef.current) {
      console.log('⏭️ SimpleAutoSave: No changes detected');
      return;
    }

    console.log('📋 SimpleAutoSave: Changes detected, scheduling save');
    lastDataRef.current = currentData;
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save in 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ SimpleAutoSave: Timeout triggered, performing save');
      performSave();
    }, 2000);
  }, [rundownTitle, items, columns, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
  };
};
