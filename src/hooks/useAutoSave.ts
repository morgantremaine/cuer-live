
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { id: rundownId } = useParams<{ id: string }>();
  const { updateRundown, saveRundown, savedRundowns } = useRundownStorage();
  const navigate = useNavigate();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  console.log('🔄 useAutoSave: Hook initialized', {
    rundownId,
    title: rundownTitle,
    itemsCount: items.length,
    columnsCount: columns?.length || 0,
    savedRundownsCount: savedRundowns.length
  });

  const currentRundown = savedRundowns.find(r => r.id === rundownId);
  const isNewRundown = !rundownId;

  console.log('🔍 useAutoSave: Rundown analysis', {
    isNewRundown,
    currentRundownExists: !!currentRundown,
    currentRundownId: currentRundown?.id
  });

  const performSave = useCallback(async () => {
    console.log('💾 performSave: Starting save operation', {
      isSaving,
      isNewRundown,
      rundownId,
      title: rundownTitle,
      itemsCount: items.length
    });

    if (isSaving) {
      console.log('⚠️ performSave: Already saving, aborting');
      return;
    }

    const trimmedTitle = rundownTitle.trim();
    if (!trimmedTitle) {
      console.log('⚠️ performSave: No title, aborting save');
      setHasUnsavedChanges(false);
      return;
    }

    setIsSaving(true);
    console.log('🚀 performSave: Save operation started');

    try {
      let result;
      
      if (isNewRundown) {
        console.log('📝 performSave: Saving new rundown');
        result = await saveRundown(trimmedTitle, items, columns);
        console.log('✅ performSave: New rundown saved', result);
        
        if (result?.id) {
          console.log('🔄 performSave: Navigating to new rundown', result.id);
          navigate(`/rundown/${result.id}`, { replace: true });
        }
      } else if (currentRundown) {
        console.log('📝 performSave: Updating existing rundown');
        result = await updateRundown(rundownId!, trimmedTitle, items, true, columns);
        console.log('✅ performSave: Existing rundown updated', result);
      } else {
        console.log('❌ performSave: Cannot save - rundown not found in storage');
        setHasUnsavedChanges(false);
        setIsSaving(false);
        return;
      }

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      console.log('🎉 performSave: Save completed successfully');

    } catch (error) {
      console.error('💥 performSave: Save failed', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsSaving(false);
      console.log('🏁 performSave: Save operation finished');
    }
  }, [isNewRundown, rundownId, rundownTitle, items, columns, currentRundown, updateRundown, saveRundown, navigate, isSaving]);

  const markAsChanged = useCallback(() => {
    const currentDataSignature = JSON.stringify({ title: rundownTitle, items, columns });
    
    console.log('🔄 markAsChanged: Called with signature length', currentDataSignature.length);
    console.log('🔄 markAsChanged: Previous signature length', lastSaveDataRef.current.length);
    
    if (currentDataSignature === lastSaveDataRef.current) {
      console.log('⏭️ markAsChanged: No changes detected, skipping');
      return;
    }

    console.log('📋 markAsChanged: Changes detected, marking as unsaved');
    setHasUnsavedChanges(true);
    lastSaveDataRef.current = currentDataSignature;

    if (saveTimeoutRef.current) {
      console.log('⏰ markAsChanged: Clearing existing timeout');
      clearTimeout(saveTimeoutRef.current);
    }

    console.log('⏰ markAsChanged: Setting new save timeout (2 seconds)');
    saveTimeoutRef.current = setTimeout(() => {
      console.log('⏰ markAsChanged: Timeout triggered, calling performSave');
      performSave();
    }, 2000);
  }, [rundownTitle, items, columns, performSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        console.log('🧹 useAutoSave: Cleanup - clearing timeout');
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSaving) {
      console.log('⏲️ useAutoSave: Setting safety timeout for stuck save state');
      const resetTimeout = setTimeout(() => {
        console.log('🔄 useAutoSave: Force resetting stuck saving state');
        setIsSaving(false);
      }, 15000);

      return () => {
        console.log('🧹 useAutoSave: Clearing safety timeout');
        clearTimeout(resetTimeout);
      };
    }
  }, [isSaving]);

  console.log('📊 useAutoSave: Current state', {
    hasUnsavedChanges,
    lastSaved: lastSaved?.toISOString(),
    isSaving
  });

  return {
    hasUnsavedChanges,
    markAsChanged,
    lastSaved,
    isSaving,
  };
};
