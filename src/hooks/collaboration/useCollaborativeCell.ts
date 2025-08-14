import { useCallback, useState } from 'react';
import { useCellPresence } from './useCellPresence';
import { useConflictDetection } from './useConflictDetection';

interface UseCollaborativeCellProps {
  rundownId: string | null;
  itemId: string;
  field: string;
  value: string;
  onUpdateValue: (value: string) => void;
  onShowConflict?: (field: string, yourValue: string, theirValue: string, lastModifiedAt?: string) => void;
}

export const useCollaborativeCell = ({
  rundownId,
  itemId,
  field,
  value,
  onUpdateValue,
  onShowConflict
}: UseCollaborativeCellProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const { 
    trackCellEdit, 
    stopCellEdit, 
    getCellEditors, 
    isCellBeingEdited 
  } = useCellPresence({ rundownId });

  const { 
    checkForConflicts, 
    updateSaveTimestamp 
  } = useConflictDetection({ rundownId });

  // Start editing - track presence
  const handleFocus = useCallback(() => {
    setIsEditing(true);
    trackCellEdit(itemId, field);
  }, [trackCellEdit, itemId, field]);

  // Stop editing - stop tracking presence
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    stopCellEdit();
  }, [stopCellEdit]);

  // Enhanced save with conflict detection
  const handleSave = useCallback(async (newValue: string) => {
    if (!rundownId) {
      onUpdateValue(newValue);
      return;
    }

    try {
      // Check for conflicts
      const conflictData = await checkForConflicts(itemId, field, newValue);
      
      if (conflictData.hasConflict && onShowConflict) {
        // Show conflict dialog
        onShowConflict(
          field, 
          newValue, 
          conflictData.currentValue || '', 
          conflictData.lastModifiedAt
        );
        return;
      }

      // No conflict, proceed with save
      onUpdateValue(newValue);
      updateSaveTimestamp(itemId, field);
      
    } catch (error) {
      console.error('Error during save:', error);
      // Fallback to regular save
      onUpdateValue(newValue);
    }
  }, [rundownId, checkForConflicts, itemId, field, onUpdateValue, onShowConflict, updateSaveTimestamp]);

  // Get editing indicators
  const editors = getCellEditors(itemId, field);
  const isBeingEditedByOthers = isCellBeingEdited(itemId, field);

  return {
    // State
    isEditing,
    isBeingEditedByOthers,
    editors,
    
    // Handlers
    handleFocus,
    handleBlur,
    handleSave
  };
};