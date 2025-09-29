import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCellLevelSave } from './useCellLevelSave';

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
}

interface UseTeleprompterSaveProps {
  rundownId: string;
  onSaveSuccess?: (itemId: string, script: string) => void;
  onSaveStart?: () => void;
  onSaveEnd?: () => void;
  trackOwnUpdate?: (timestamp: string) => void;
}

export const useTeleprompterSave = ({ rundownId, onSaveSuccess, onSaveStart, onSaveEnd, trackOwnUpdate }: UseTeleprompterSaveProps) => {
  const { user } = useAuth();
  
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveError: null
  });

  // Use the same per-cell save system as the main rundown
  const { trackCellChange, flushPendingUpdates, hasPendingUpdates } = useCellLevelSave(
    rundownId,
    trackOwnUpdate || (() => {}),
    (savedUpdates) => {
      // Handle save completion with details about what was saved
      console.log('📝 Teleprompter: Save completion callback fired', { savedUpdates: savedUpdates?.length });
      
      if (savedUpdates && savedUpdates.length > 0) {
        savedUpdates.forEach(update => {
          if (update.itemId && update.field === 'script') {
            console.log('📝 Teleprompter: Processing successful save for script field', { itemId: update.itemId });
            
            // Clear the local backup for this item since save was successful
            clearBackup(update.itemId);
            console.log('🗑️ Teleprompter: Cleared local backup for item', { itemId: update.itemId });
            
            onSaveSuccess?.(update.itemId, update.value);
          }
        });
        
        // Clear save state AFTER processing all saves
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          saveError: null
        }));
        console.log('📝 Teleprompter: Save state cleared - hasUnsavedChanges set to false');
      }
      onSaveEnd?.();
    },
    onSaveStart,
    () => {
      console.log('📝 Teleprompter: Unsaved changes detected');
      setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));
    }
  );

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localBackupRef = useRef<Map<string, string>>(new Map());
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Backup changes locally
  const backupChange = useCallback((itemId: string, script: string) => {
    localBackupRef.current.set(itemId, script);
    localStorage.setItem(`teleprompter_backup_${rundownId}`, 
      JSON.stringify(Object.fromEntries(localBackupRef.current))
    );
  }, [rundownId]);

  // Clear backup after successful save
  const clearBackup = useCallback((itemId: string) => {
    localBackupRef.current.delete(itemId);
    const remaining = Object.fromEntries(localBackupRef.current);
    if (Object.keys(remaining).length === 0) {
      localStorage.removeItem(`teleprompter_backup_${rundownId}`);
    } else {
      localStorage.setItem(`teleprompter_backup_${rundownId}`, JSON.stringify(remaining));
    }
  }, [rundownId]);

  // Simple save function using per-cell save system
  const executeSave = useCallback(async (
    itemId: string, 
    script: string
  ): Promise<boolean> => {
    try {
      console.log('📝 Teleprompter: Saving script for item', { itemId, scriptLength: script.length });
      
      // Use per-cell save system - this will automatically handle conflicts and coordination
      trackCellChange(itemId, 'script', script);
      
      // Immediately flush to ensure save happens now
      const result = await flushPendingUpdates();
      
      if (result?.updatedAt) {
        console.log('✅ Teleprompter: Per-cell save completed for item', { itemId });
        
        // Call the success callback since per-cell save doesn't do this automatically
        onSaveSuccess?.(itemId, script);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Teleprompter save execution failed:', error);
      throw error;
    }
  }, [trackCellChange, flushPendingUpdates, onSaveSuccess]);

  // Main save function - now much simpler with per-cell saves
  const saveScript = useCallback(async (
    itemId: string, 
    newScript: string, 
    rundownData?: any
  ): Promise<boolean> => {
    try {
      // Backup the change immediately
      backupChange(itemId, newScript);
      
      setSaveState(prev => ({ 
        ...prev, 
        isSaving: true, 
        hasUnsavedChanges: true,
        saveError: null 
      }));
      
      // Execute the save using per-cell system
      const success = await executeSave(itemId, newScript);
      
      if (success) {
        // Clear backup and update state
        clearBackup(itemId);
        retryCountRef.current.delete(itemId);
        
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          saveError: null
        }));
        
        // Call success callback
        onSaveSuccess?.(itemId, newScript);
      } else {
        // Handle save failure
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          saveError: 'Save failed - please try again'
        }));

        // Show error toast with retry option
        toast.error('Save failed - please try again', {
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => saveScript(itemId, newScript)
          }
        });
      }
      
      return success;
    } catch (error) {
      console.error('❌ Teleprompter saveScript failed:', error);
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        saveError: 'Save failed - please try again'
      }));
      return false;
    }
  }, [executeSave, backupChange, clearBackup, onSaveSuccess]);

  // Simplified save function - just track changes and let per-cell system handle debouncing
  const debouncedSave = useCallback((
    itemId: string, 
    newScript: string, 
    rundownData?: any,
    delay: number = 500
  ) => {
    // Backup immediately
    backupChange(itemId, newScript);
    
    // Track the change immediately - per-cell save system will handle debouncing
    trackCellChange(itemId, 'script', newScript);
  }, [backupChange, trackCellChange]);

  // Manual save function (for Ctrl+S) - calls executeSave to ensure callbacks work
  const forceSave = useCallback(async (itemId: string, script: string, rundownData?: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Use executeSave to ensure callbacks fire
    return await executeSave(itemId, script);
  }, [executeSave]);

  // Load backup data on init
  const loadBackup = useCallback(() => {
    try {
      const backup = localStorage.getItem(`teleprompter_backup_${rundownId}`);
      if (backup) {
        const data = JSON.parse(backup);
        localBackupRef.current = new Map(Object.entries(data));
        return data;
      }
    } catch (error) {
      console.error('Failed to load backup:', error);
    }
    return {};
  }, [rundownId]);

  return {
    saveState: {
      ...saveState,
      // Only override hasUnsavedChanges if we actually have pending updates
      hasUnsavedChanges: saveState.hasUnsavedChanges || hasPendingUpdates()
    },
    debouncedSave,
    forceSave,
    loadBackup,
    clearAllBackups: () => {
      localStorage.removeItem(`teleprompter_backup_${rundownId}`);
      localBackupRef.current.clear();
    }
  };
};
