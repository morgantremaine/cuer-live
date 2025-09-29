import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedSaveCoordination } from './useUnifiedSaveCoordination';
import { useDocVersionManager } from './useDocVersionManager';
import { useConflictResolution } from './useConflictResolution';

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
  const { coordinateTeleprompterSave } = useUnifiedSaveCoordination({
    rundownId,
    isPerCellEnabled: false // Teleprompter uses regular saves
  });
  const docVersionManager = useDocVersionManager(rundownId);
  const conflictResolution = useConflictResolution({
    rundownId,
    userId: user?.id,
    onResolutionApplied: (mergedData, conflictFields) => {
      console.log('🔀 Teleprompter: Conflict resolved', { conflictFields });
    }
  });

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

  // Enhanced save function with unified coordination and conflict resolution
  const executeSave = useCallback(async (
    itemId: string, 
    script: string, 
    rundownData: any
  ): Promise<boolean> => {
    try {
      // Track this edit for conflict resolution
      conflictResolution.trackLocalEdit(`${itemId}-script`, script);

      // Prepare the update data
      const updatedItems = rundownData.items.map((item: any) =>
        item.id === itemId ? { ...item, script } : item
      );

      const updateData = {
        items: updatedItems,
        last_updated_by: user?.id || null
      };

      // Use doc version manager for proper concurrency control
      const success = await docVersionManager.executeSave(
        updateData,
        (result) => {
          // Track our successful update
          if (trackOwnUpdate) {
            trackOwnUpdate(result.updated_at);
          }
          console.log('✅ Teleprompter save successful:', { itemId, docVersion: result.doc_version });
        },
        async (conflictData) => {
          // Handle version conflict with smart resolution
          console.warn('⚠️ Teleprompter version conflict - resolving', { itemId });
          
          const resolution = await conflictResolution.resolveConflicts(
            { items: updatedItems }, // Our local state
            conflictData, // Server state
            { autoResolve: true }
          );

          if (resolution.hadConflicts) {
            // Retry with merged data
            console.log('🔄 Teleprompter retrying with conflict resolution');
            return docVersionManager.executeSave(
              {
                items: resolution.mergedData.items,
                last_updated_by: user?.id || null
              },
              (retryResult) => {
                if (trackOwnUpdate) {
                  trackOwnUpdate(retryResult.updated_at);
                }
                console.log('✅ Teleprompter conflict resolution save successful:', { itemId });
              }
            );
          }
        }
      );

      return success;
    } catch (error) {
      console.error('❌ Teleprompter save execution failed:', error);
      throw error;
    }
  }, [rundownId, user?.id, conflictResolution, docVersionManager, trackOwnUpdate]);

  // Main coordinated save function
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
    
    // Use unified coordination for teleprompter saves
    const success = await coordinateTeleprompterSave(
      async () => { await executeSave(itemId, newScript, rundownData); },
      {
        immediate: true, // Teleprompter saves should be immediate
        onComplete: (saveSuccess) => {
          console.log('📝 Teleprompter save completed:', { itemId, saveSuccess });
          
          if (saveSuccess) {
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
          } else {
            // Handle save failure
            setSaveState(prev => ({
              ...prev,
              isSaving: false,
              saveError: 'Save failed - please try again'
            }));

            // Signal save end to parent (even on error)
            onSaveEnd?.();

            // Show error toast with retry option
            toast.error('Save failed - please try again', {
              duration: 5000,
              action: {
                label: 'Retry',
                onClick: () => saveScript(itemId, newScript, rundownData)
              }
            });
          }
        }
      }
    );

    return success;
  }, [coordinateTeleprompterSave, executeSave, backupChange, clearBackup, onSaveSuccess, onSaveStart, onSaveEnd]);

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
