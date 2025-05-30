
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
  const { updateRundown, saveRundown } = useRundownStorage();
  const navigate = useNavigate();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  console.log('🔄 SimpleAutoSave: Hook called', { 
    rundownId, 
    title: rundownTitle, 
    itemsCount: items.length,
    hasUnsavedChanges,
    isSaving
  });

  // Initialize lastDataRef on first load
  useEffect(() => {
    if (!isInitializedRef.current && items.length > 0) {
      lastDataRef.current = JSON.stringify({ title: rundownTitle, items, columns });
      isInitializedRef.current = true;
      console.log('🎯 SimpleAutoSave: Initialized with existing data');
    }
  }, [items, rundownTitle, columns]);

  const performSave = useCallback(async () => {
    if (isSaving) {
      console.log('⚠️ SimpleAutoSave: Already saving, skipping');
      return;
    }

    const trimmedTitle = rundownTitle.trim();
    if (!trimmedTitle) {
      console.log('⚠️ SimpleAutoSave: No title, skipping save');
      return;
    }

    console.log('🚀 SimpleAutoSave: Starting save', { rundownId, title: trimmedTitle });
    setIsSaving(true);

    try {
      if (!rundownId) {
        // Create new rundown
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
        console.log('✅ SimpleAutoSave: Rundown updated');
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      lastDataRef.current = JSON.stringify({ title: trimmedTitle, items, columns });
      console.log('🎉 SimpleAutoSave: Save completed successfully');
      
    } catch (error) {
      console.error('💥 SimpleAutoSave: Save failed', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, rundownTitle, items, columns, saveRundown, updateRundown, navigate, isSaving]);

  const markAsChanged = useCallback(() => {
    if (!isInitializedRef.current) {
      console.log('⏭️ SimpleAutoSave: Not initialized yet, skipping change detection');
      return;
    }

    const currentData = JSON.stringify({ title: rundownTitle, items, columns });
    
    if (currentData === lastDataRef.current) {
      console.log('⏭️ SimpleAutoSave: No actual changes detected');
      return;
    }

    console.log('📋 SimpleAutoSave: Changes detected, scheduling save');
    console.log('📋 Old data length:', lastDataRef.current.length);
    console.log('📋 New data length:', currentData.length);
    
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
