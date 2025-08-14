import { useCallback } from 'react';
import { useCellEditingState } from './useCellEditingState';
import { useFieldLevelSave } from './useFieldLevelSave';
import { useConflictResolution } from './useConflictResolution';

interface UseCollaborationFeaturesProps {
  rundownId: string | null;
  enabled?: boolean;
  onFieldSaved?: (itemId: string, fieldName: string, value: string) => void;
}

export const useCollaborationFeatures = ({ 
  rundownId, 
  enabled = true,
  onFieldSaved 
}: UseCollaborationFeaturesProps) => {
  const cellEditing = useCellEditingState({ rundownId, enabled });
  const conflictResolution = useConflictResolution();
  
  const fieldSave = useFieldLevelSave({ 
    rundownId, 
    onConflictDetected: conflictResolution.addConflict 
  });

  // Enhanced update item function with collaboration features
  const collaborativeUpdateItem = useCallback(async (
    itemId: string, 
    fieldName: string, 
    value: string,
    options: {
      immediate?: boolean;
      debounceMs?: number;
    } = {}
  ) => {
    const { immediate = false, debounceMs = 1000 } = options;

    try {
      let success = false;

      if (immediate) {
        success = await fieldSave.immediateSaveField(itemId, fieldName, value);
      } else {
        fieldSave.debouncedSaveField(itemId, fieldName, value, debounceMs);
        success = true; // Debounced saves are assumed successful
      }

      if (success && onFieldSaved) {
        onFieldSaved(itemId, fieldName, value);
      }

      return success;
    } catch (error) {
      console.error('Error in collaborative update:', error);
      return false;
    }
  }, [fieldSave, onFieldSaved]);

  // Enhanced cell interaction handlers
  const handleCellFocus = useCallback(async (itemId: string, fieldName: string) => {
    if (!enabled) return true;

    const canEdit = await cellEditing.startEditing(itemId, fieldName);
    
    if (!canEdit) {
      const editingUser = cellEditing.getCellEditingUser(itemId, fieldName);
      console.log(`Cell being edited by: ${editingUser?.userEmail}`);
    }

    return canEdit;
  }, [cellEditing, enabled]);

  const handleCellBlur = useCallback((itemId: string, fieldName: string) => {
    if (!enabled) return;
    cellEditing.stopEditing(itemId, fieldName);
  }, [cellEditing, enabled]);

  // Resolve conflict with field save
  const handleConflictResolution = useCallback((resolution: any) => {
    if (!conflictResolution.currentConflict) return;

    const { itemId, fieldName } = conflictResolution.currentConflict;
    
    conflictResolution.resolveConflict(resolution, (resolvedValue) => {
      // Immediately save the resolved value
      fieldSave.immediateSaveField(itemId, fieldName, resolvedValue);
      
      if (onFieldSaved) {
        onFieldSaved(itemId, fieldName, resolvedValue);
      }
    });
  }, [conflictResolution, fieldSave, onFieldSaved]);

  return {
    // Cell editing state
    isCellBeingEdited: cellEditing.isCellBeingEdited,
    getCellEditingUser: cellEditing.getCellEditingUser,
    currentlyEditing: cellEditing.currentlyEditing,
    
    // Conflict resolution
    hasConflict: conflictResolution.hasConflict,
    activeConflicts: conflictResolution.activeConflicts,
    conflictCount: conflictResolution.conflictCount,
    isConflictDialogOpen: conflictResolution.isConflictDialogOpen,
    currentConflict: conflictResolution.currentConflict,
    
    // Actions
    collaborativeUpdateItem,
    handleCellFocus,
    handleCellBlur,
    handleConflictResolution,
    dismissConflictDialog: conflictResolution.dismissConflictDialog,
    
    // Field save utilities
    updateFieldTimestamp: fieldSave.updateFieldTimestamp,
    detectConflict: fieldSave.detectConflict
  };
};