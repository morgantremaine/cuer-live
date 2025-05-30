
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string) => {
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveAttemptRef = useRef<string>('');

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

  // Schedule auto-save when data changes
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || isSaving || !user) {
      console.log('⏸️ Skipping auto-save scheduling:', { 
        hasUnsavedChanges, 
        isInitialized, 
        isSaving, 
        hasUser: !!user,
        userId: user?.id || 'none'
      });
      return;
    }

    // Create a unique identifier for this save attempt
    const currentDataSignature = `${items.length}-${rundownTitle}-${items.map(i => i.id).join(',')}`;
    
    // Only schedule if this is different from the last attempt
    if (lastSaveAttemptRef.current === currentDataSignature) {
      console.log('📋 Same data signature, skipping schedule');
      return;
    }

    lastSaveAttemptRef.current = currentDataSignature;

    console.log('⏰ Scheduling auto-save in 2 seconds...');
    console.log('📊 Current data to save:', {
      itemsCount: items.length,
      title: rundownTitle,
      firstItemId: items[0]?.id || 'none',
      lastItemId: items[items.length - 1]?.id || 'none',
      signature: currentDataSignature
    });
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      console.log('🚫 Clearing existing save timeout');
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule new save with the current data captured in closure
    const currentItems = [...items];
    const currentTitle = rundownTitle;
    
    saveTimeoutRef.current = setTimeout(async () => {
      console.log('⚡ Timeout executing for signature:', currentDataSignature);
      console.log('🎯 Auto-save timeout triggered, attempting save...');
      console.log('📤 Saving data:', {
        itemsCount: currentItems.length,
        title: currentTitle,
        userId: user?.id
      });
      
      try {
        const success = await performSave(currentItems, currentTitle);
        console.log('💾 Save operation result:', success);
        
        if (success) {
          console.log('✅ Auto-save successful, marking as saved');
          markAsSaved(currentItems, currentTitle);
        } else {
          console.log('❌ Auto-save failed, keeping unsaved state');
          setHasUnsavedChanges(true);
        }
      } catch (error) {
        console.error('💥 Auto-save threw an error:', error);
        setHasUnsavedChanges(true);
      }
      
      saveTimeoutRef.current = null;
    }, 2000);

  }, [hasUnsavedChanges, isInitialized, isSaving, user?.id, items.length, rundownTitle, items.map(i => `${i.id}-${i.name}-${i.startTime}-${i.duration}`).join('|')]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        console.log('🧹 Component unmount: clearing save timeout');
        clearTimeout(saveTimeoutRef.current);
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
