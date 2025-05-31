
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized 
  } = useChangeTracking(items, rundownTitle);

  console.log('🚀 AutoSave render:', {
    itemsCount: items.length,
    title: rundownTitle,
    columnsCount: columns?.length || 0,
    hasUnsavedChanges,
    isSaving,
    initialized: isInitialized,
    userLoggedIn: !!user,
    userId: user?.id || 'none'
  });

  // Create a debounced save function that's stable across renders
  const debouncedSave = useCallback(async (itemsToSave: RundownItem[], titleToSave: string, columnsToSave?: Column[]) => {
    console.log('🎯 Debounced save triggered');
    
    if (!user || isSaving) {
      console.log('⏸️ Skipping save - no user or already saving');
      return;
    }

    try {
      const success = await performSave(itemsToSave, titleToSave, columnsToSave);
      console.log('💾 Save operation result:', success);
      
      if (success) {
        console.log('✅ Auto-save successful, marking as saved');
        markAsSaved(itemsToSave, titleToSave);
      } else {
        console.log('❌ Auto-save failed, keeping unsaved state');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('💥 Auto-save threw an error:', error);
      setHasUnsavedChanges(true);
    }
  }, [user, isSaving, performSave, markAsSaved, setHasUnsavedChanges]);

  // Main effect that schedules saves
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user) {
      console.log('⏸️ Skipping auto-save scheduling:', { 
        hasUnsavedChanges, 
        isInitialized, 
        hasUser: !!user
      });
      return;
    }

    // Create a unique signature for this data including columns
    const currentDataSignature = JSON.stringify({ items, title: rundownTitle, columns });
    
    // Only schedule if data actually changed
    if (lastSaveDataRef.current === currentDataSignature) {
      console.log('📋 Same data signature, skipping schedule');
      return;
    }

    console.log('⏰ Scheduling debounced auto-save...');
    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      console.log('🚫 Clearing existing debounce timeout');
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule new save
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('⚡ Executing debounced auto-save');
      debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined);
      debounceTimeoutRef.current = null;
    }, 2000);

  }, [hasUnsavedChanges, isInitialized, user, items, rundownTitle, columns, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        console.log('🧹 Cleanup: clearing debounce timeout');
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const markAsChangedCallback = () => {
    markAsChanged();
  };

  return {
    hasUnsavedChanges,
    isSaving,
    markAsChanged: markAsChangedCallback
  };
};
