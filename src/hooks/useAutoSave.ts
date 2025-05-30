
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    hasUnsavedChanges,
    isSaving,
    initialized: isInitialized,
    userLoggedIn: !!user,
    userId: user?.id || 'none'
  });

  // Stable callback for performing save
  const performSaveCallback = useCallback(async () => {
    console.log('🎯 Auto-save timeout triggered, attempting save...');
    console.log('📤 Saving data:', {
      itemsCount: items.length,
      title: rundownTitle,
      userId: user?.id
    });
    
    try {
      const success = await performSave(items, rundownTitle);
      console.log('💾 Save operation result:', success);
      
      if (success) {
        console.log('✅ Auto-save successful, marking as saved');
        markAsSaved(items, rundownTitle);
      } else {
        console.log('❌ Auto-save failed, keeping unsaved state');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('💥 Auto-save threw an error:', error);
      setHasUnsavedChanges(true);
    }
  }, [items, rundownTitle, performSave, markAsSaved, setHasUnsavedChanges, user?.id]);

  // Auto-save when there are unsaved changes
  useEffect(() => {
    console.log('⚡ Auto-save effect triggered:', {
      hasUnsavedChanges,
      isInitialized,
      isSaving,
      hasUser: !!user,
      userId: user?.id || 'none'
    });

    if (!hasUnsavedChanges || !isInitialized || isSaving || !user) {
      console.log('⏸️ Skipping auto-save:', { 
        hasUnsavedChanges, 
        isInitialized, 
        isSaving, 
        hasUser: !!user,
        userId: user?.id || 'none'
      });
      return;
    }

    console.log('⏰ Scheduling auto-save in 2 seconds...');
    console.log('📊 Current data to save:', {
      itemsCount: items.length,
      title: rundownTitle,
      firstItemId: items[0]?.id || 'none',
      lastItemId: items[items.length - 1]?.id || 'none'
    });
    
    // Clear existing timeout only if it exists
    if (saveTimeoutRef.current) {
      console.log('🚫 Clearing existing save timeout');
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule save after 2 seconds
    saveTimeoutRef.current = setTimeout(performSaveCallback, 2000);

    // NO cleanup function - let the timeout complete
  }, [hasUnsavedChanges, isInitialized, isSaving, user?.id, performSaveCallback]);

  // Cleanup ONLY on component unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        console.log('🧹 Component unmount: clearing save timeout');
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const markAsChangedCallback = useCallback(() => {
    markAsChanged();
  }, [markAsChanged]);

  return {
    hasUnsavedChanges,
    isSaving,
    markAsChanged: markAsChangedCallback
  };
};
