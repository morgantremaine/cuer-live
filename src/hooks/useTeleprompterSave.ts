import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
}

export const useTeleprompterSave = ({ rundownId, onSaveSuccess, onSaveStart, onSaveEnd }: UseTeleprompterSaveProps) => {
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveError: null
  });

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

  // Retry mechanism with exponential backoff
  const retrySave = useCallback(async (
    itemId: string, 
    script: string, 
    rundownData: any,
    attempt: number = 1
  ): Promise<boolean> => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      // Update the database with retry logic
      const updatedItems = rundownData.items.map((item: any) =>
        item.id === itemId ? { ...item, script } : item
      );

      const { error } = await supabase
        .from('rundowns')
        .update({ 
          items: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Save attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retrySave(itemId, script, rundownData, attempt + 1);
      }
      
      throw error;
    }
  }, [rundownId]);

  // Main save function
  const saveScript = useCallback(async (
    itemId: string, 
    newScript: string, 
    rundownData: any
  ): Promise<boolean> => {
    // Backup the change immediately
    backupChange(itemId, newScript);
    
    // Signal save start to parent (for blue Wi-Fi indicator)
    onSaveStart?.();
    
    setSaveState(prev => ({ 
      ...prev, 
      isSaving: true, 
      hasUnsavedChanges: true,
      saveError: null 
    }));

    try {
      const success = await retrySave(itemId, newScript, rundownData);
      
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

        // Signal save end to parent
        onSaveEnd?.();
        
        // Call success callback
        onSaveSuccess?.(itemId, newScript);
        
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save script';
      
      // Signal save end to parent (even on error)
      onSaveEnd?.();
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        saveError: errorMessage
      }));

      // Show error toast with retry option
      toast.error(`Save failed: ${errorMessage}`, {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => saveScript(itemId, newScript, rundownData)
        }
      });

      return false;
    }
  }, [backupChange, clearBackup, retrySave, onSaveSuccess, onSaveStart, onSaveEnd]);

  // Debounced save function with faster default delay
  const debouncedSave = useCallback((
    itemId: string, 
    newScript: string, 
    rundownData: any,
    delay: number = 500
  ) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Backup immediately
    backupChange(itemId, newScript);
    
    setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveScript(itemId, newScript, rundownData);
    }, delay);
  }, [backupChange, saveScript]);

  // Manual save function (for Ctrl+S)
  const forceSave = useCallback(async (itemId: string, script: string, rundownData: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await saveScript(itemId, script, rundownData);
  }, [saveScript]);

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
    saveState,
    debouncedSave,
    forceSave,
    loadBackup,
    clearAllBackups: () => {
      localStorage.removeItem(`teleprompter_backup_${rundownId}`);
      localBackupRef.current.clear();
    }
  };
};
