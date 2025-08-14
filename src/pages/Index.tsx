
import React from 'react';
import RundownIndexContent from '@/components/RundownIndexContent';
import { ConflictResolutionDialog } from '@/components/collaboration/ConflictResolutionDialog';
import { useRundownGridCore } from '@/hooks/useRundownGridCore';

const Index = () => {
  const state = useRundownGridCore();

  return (
    <div className="h-screen overflow-hidden">
      <RundownIndexContent />
      
      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        isOpen={state.collaboration.isConflictDialogOpen}
        conflict={state.collaboration.currentConflict}
        onResolve={state.collaboration.handleConflictResolution}
        onDismiss={state.collaboration.dismissConflictDialog}
      />
      
      {/* Show conflict count indicator if there are conflicts */}
      {state.collaboration.conflictCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg z-50">
          {state.collaboration.conflictCount} conflict{state.collaboration.conflictCount > 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
};

export default Index;
