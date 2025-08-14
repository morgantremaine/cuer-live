import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, User, Clock } from 'lucide-react';

interface ConflictInfo {
  itemId: string;
  fieldName: string;
  localValue: string;
  remoteValue: string;
  remoteTimestamp: string;
  remoteUserId: string;
}

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  conflict: ConflictInfo | null;
  onResolve: (resolution: { conflictId: string; resolution: 'local' | 'remote' | 'merge'; resolvedValue?: string }) => void;
  onDismiss: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  conflict,
  onResolve,
  onDismiss
}) => {
  const [mergeValue, setMergeValue] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge'>('local');

  if (!conflict) return null;

  const handleResolve = () => {
    onResolve({
      conflictId: `${conflict.itemId}-${conflict.fieldName}`,
      resolution: selectedResolution,
      resolvedValue: selectedResolution === 'merge' ? mergeValue : undefined
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFieldName = (fieldName: string) => {
    if (fieldName.startsWith('customFields.')) {
      return fieldName.replace('customFields.', '').replace(/([A-Z])/g, ' $1').trim();
    }
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onDismiss}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Editing Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Another user has modified the <strong>{formatFieldName(conflict.fieldName)}</strong> field 
            while you were editing. Please choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3" />
                <span className="text-sm">Modified by user: {conflict.remoteUserId}</span>
                <Clock className="h-3 w-3 ml-2" />
                <span className="text-sm">{formatTimestamp(conflict.remoteTimestamp)}</span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Resolution Options */}
          <div className="space-y-4">
            {/* Keep Your Changes */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="local"
                  name="resolution"
                  checked={selectedResolution === 'local'}
                  onChange={() => setSelectedResolution('local')}
                  className="h-4 w-4"
                />
                <label htmlFor="local" className="font-medium">
                  Keep Your Changes
                </label>
                <Badge variant="secondary">Your Version</Badge>
              </div>
              <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                {conflict.localValue || <em className="text-muted-foreground">Empty</em>}
              </div>
            </div>

            {/* Accept Their Changes */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="remote"
                  name="resolution"
                  checked={selectedResolution === 'remote'}
                  onChange={() => setSelectedResolution('remote')}
                  className="h-4 w-4"
                />
                <label htmlFor="remote" className="font-medium">
                  Accept Their Changes
                </label>
                <Badge variant="destructive">Their Version</Badge>
              </div>
              <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                {conflict.remoteValue || <em className="text-muted-foreground">Empty</em>}
              </div>
            </div>

            {/* Merge Manually */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="merge"
                  name="resolution"
                  checked={selectedResolution === 'merge'}
                  onChange={() => {
                    setSelectedResolution('merge');
                    if (!mergeValue) {
                      setMergeValue(conflict.localValue + '\n\n' + conflict.remoteValue);
                    }
                  }}
                  className="h-4 w-4"
                />
                <label htmlFor="merge" className="font-medium">
                  Merge Manually
                </label>
                <Badge variant="outline">Custom Merge</Badge>
              </div>
              {selectedResolution === 'merge' && (
                <Textarea
                  value={mergeValue}
                  onChange={(e) => setMergeValue(e.target.value)}
                  placeholder="Combine both versions as needed..."
                  className="min-h-32"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDismiss}>
            Cancel
          </Button>
          <Button onClick={handleResolve} className="bg-primary">
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
