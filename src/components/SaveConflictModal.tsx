import React from 'react';
import { RundownState } from '@/hooks/useRundownState';

interface SaveConflictModalProps {
  isOpen: boolean;
  conflictData: {
    currentState: any;
    currentDocVersion: number;
    localUpdates: any[];
  } | null;
  state: RundownState;
  rundownId: string | null;
  onRefresh: () => void;
  onDownloadAndRefresh: () => void;
  onKeepEditing: () => void;
}

export const SaveConflictModal = ({
  isOpen,
  conflictData,
  state,
  onRefresh,
  onDownloadAndRefresh,
  onKeepEditing
}: SaveConflictModalProps) => {
  if (!isOpen || !conflictData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background border border-destructive rounded-lg max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-destructive mt-1 text-2xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Sync Conflict Detected
            </h2>
            <p className="text-muted-foreground mb-4">
              Someone else has modified this rundown while you were editing. 
              Your local changes conflict with the server version (v{conflictData.currentDocVersion}).
            </p>
            <div className="bg-muted p-3 rounded mb-4 text-sm">
              <strong>Your pending changes:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {conflictData.localUpdates.slice(0, 5).map((update, i) => (
                  <li key={i}>
                    <strong>{update.field}</strong>
                    {update.itemId ? ` (row ${update.itemId.slice(0, 8)})` : ''}
                  </li>
                ))}
                {conflictData.localUpdates.length > 5 && (
                  <li>...and {conflictData.localUpdates.length - 5} more</li>
                )}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>What would you like to do?</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onRefresh}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors"
          >
            🔄 Refresh to Latest Version (Recommended)
          </button>
          <button
            onClick={onDownloadAndRefresh}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            💾 Download My Version as Backup, Then Refresh
          </button>
          <button
            onClick={onKeepEditing}
            className="w-full px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors"
          >
            ⚠️ Keep Editing (Risky - May Overwrite Others)
          </button>
        </div>
      </div>
    </div>
  );
};
