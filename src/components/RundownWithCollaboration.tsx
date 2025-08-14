import React from 'react';
import RundownIndexContent from './RundownIndexContent';
import { ConflictDialog } from './collaboration/ConflictDialog';
import { useSimplifiedRundownState } from '@/hooks/useSimplifiedRundownState';

const RundownWithCollaboration = () => {
  const { conflictDialog, handleConflictResolution } = useSimplifiedRundownState();

  return (
    <>
      <RundownIndexContent />
      
      {/* Conflict Resolution Dialog */}
      <ConflictDialog
        isOpen={conflictDialog.isOpen}
        onClose={() => handleConflictResolution(false)}
        onKeepChanges={() => handleConflictResolution(true)}
        onDiscardChanges={() => handleConflictResolution(false)}
        field={conflictDialog.field}
        yourValue={conflictDialog.yourValue}
        theirValue={conflictDialog.theirValue}
        lastModifiedAt={conflictDialog.lastModifiedAt}
      />
    </>
  );
};

export default RundownWithCollaboration;