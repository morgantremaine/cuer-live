import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepChanges: () => void;
  onDiscardChanges: () => void;
  field: string;
  yourValue: string;
  theirValue: string;
  lastModifiedAt?: string;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  onClose,
  onKeepChanges,
  onDiscardChanges,
  field,
  yourValue,
  theirValue,
  lastModifiedAt
}) => {
  const formatFieldName = (field: string) => {
    if (field.startsWith('customFields.')) {
      return field.replace('customFields.', '').replace(/([A-Z])/g, ' $1').trim();
    }
    return field.replace(/([A-Z])/g, ' $1').trim();
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'recently';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Save Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This {formatFieldName(field)} field was changed by a teammate {formatTime(lastModifiedAt)}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Current value (teammate's):</div>
            <div className="p-2 bg-muted rounded text-sm max-h-20 overflow-y-auto">
              {theirValue || '(empty)'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Your changes:</div>
            <div className="p-2 bg-background border rounded text-sm max-h-20 overflow-y-auto">
              {yourValue || '(empty)'}
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onDiscardChanges}>
              Use Teammate's Version
            </Button>
            <Button onClick={onKeepChanges}>
              Keep My Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};