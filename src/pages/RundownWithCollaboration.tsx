import React from 'react';
import { useParams } from 'react-router-dom';
import { useRundownGridCore } from '@/hooks/useRundownGridCore';
import { useCollaborationFeatures } from '@/hooks/collaboration/useCollaborationFeatures';
import { ConflictResolutionDialog } from '@/components/collaboration/ConflictResolutionDialog';
import RundownContent from '@/components/RundownContent';
import { toast } from 'sonner';

export default function RundownWithCollaboration() {
  const params = useParams<{ id: string }>();
  const rundownId = params.id === 'new' ? null : params.id || null;
  
  // Core rundown functionality
  const coreState = useRundownGridCore();
  
  // Collaboration features
  const collaboration = useCollaborationFeatures({
    rundownId,
    enabled: !!rundownId,
    onFieldSaved: (itemId, fieldName, value) => {
      console.log(`✅ Field saved collaboratively: ${fieldName} for ${itemId}`);
    }
  });

  // Enhanced update item with collaboration
  const handleUpdateItem = async (id: string, field: string, value: string) => {
    // Use collaborative update for typing fields (debounced)
    const isTypingField = field === 'name' || field === 'script' || field === 'talent' || 
                          field === 'notes' || field === 'gfx' || field === 'video' || 
                          field === 'images' || field.startsWith('customFields.');

    if (isTypingField) {
      await collaboration.collaborativeUpdateItem(id, field, value, {
        immediate: false,
        debounceMs: 800
      });
    } else {
      // Immediate save for critical fields like duration, color
      await collaboration.collaborativeUpdateItem(id, field, value, {
        immediate: true
      });
    }
    
    // Update local state immediately for responsiveness
    coreState.updateItem(id, field, value);
  };

  // Enhanced cell click handler
  const handleCellClick = async (itemId: string, field: string) => {
    const canEdit = await collaboration.handleCellFocus(itemId, field);
    if (!canEdit) {
      const editingUser = collaboration.getCellEditingUser(itemId, field);
      toast.error(`This field is being edited by ${editingUser?.userEmail || 'another user'}`);
    }
  };

  // Get collaboration state for a specific cell
  const getCellCollaborationState = (itemId: string, fieldName: string) => {
    return {
      isBeingEdited: collaboration.isCellBeingEdited(itemId, fieldName),
      editingUserEmail: collaboration.getCellEditingUser(itemId, fieldName)?.userEmail,
      hasConflict: collaboration.hasConflict(itemId, fieldName)
    };
  };

  return (
    <>
      <RundownContent
        {...coreState}
        onUpdateItem={handleUpdateItem}
        onCellClick={handleCellClick}
        onCellBlur={collaboration.handleCellBlur}
        getCellCollaborationState={getCellCollaborationState}
      />
      
      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        isOpen={collaboration.isConflictDialogOpen}
        conflict={collaboration.currentConflict}
        onResolve={collaboration.handleConflictResolution}
        onDismiss={collaboration.dismissConflictDialog}
      />
      
      {/* Show conflict count in corner if there are conflicts */}
      {collaboration.conflictCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg">
          {collaboration.conflictCount} conflict{collaboration.conflictCount > 1 ? 's' : ''} detected
        </div>
      )}
    </>
  );
}