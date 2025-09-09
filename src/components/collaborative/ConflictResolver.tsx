/**
 * Conflict Resolution Dialog
 * Handles OT conflicts when they occur
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollaborativeStore, useCollaborativeActions } from '@/stores/collaborativeState';

export const ConflictResolver: React.FC = () => {
  const showDialog = useCollaborativeStore(state => state.showConflictDialog);
  const activeConflicts = useCollaborativeStore(state => state.activeConflicts);
  const { resolveConflict, setShowConflictDialog } = useCollaborativeActions();

  const handleResolve = (conflictId: string, resolution: 'prefer_local' | 'prefer_remote' | 'merge') => {
    resolveConflict(conflictId, resolution);
  };

  if (!showDialog || activeConflicts.length === 0) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowConflictDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve Editing Conflicts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {activeConflicts.map((conflict, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">
                Conflict in {conflict.metadata?.field || 'unknown field'}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Your changes:</p>
                  <div className="bg-green-50 p-2 rounded text-sm">
                    {JSON.stringify(conflict.metadata?.op1Value)}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Other user's changes:</p>
                  <div className="bg-blue-50 p-2 rounded text-sm">
                    {JSON.stringify(conflict.metadata?.op2Value)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleResolve(conflict.id, 'prefer_local')}
                >
                  Keep Mine
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleResolve(conflict.id, 'prefer_remote')}
                >
                  Keep Theirs
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleResolve(conflict.id, 'merge')}
                >
                  Try to Merge
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};