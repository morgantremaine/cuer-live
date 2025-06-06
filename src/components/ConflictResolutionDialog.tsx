
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictData {
  itemId: string;
  field: string;
  localValue: string;
  remoteValue: string;
  localModifiedBy?: string;
  remoteModifiedBy?: string;
  localTimestamp: number;
  remoteTimestamp: number;
}

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictData[];
  onResolve: (resolutions: Array<{ itemId: string; field: string; useRemote: boolean }>) => void;
}

const ConflictResolutionDialog = ({ 
  isOpen, 
  onClose, 
  conflicts, 
  onResolve 
}: ConflictResolutionDialogProps) => {
  const [resolutions, setResolutions] = React.useState<Map<string, boolean>>(new Map());

  const handleResolutionChange = (conflictKey: string, useRemote: boolean) => {
    setResolutions(prev => new Map(prev.set(conflictKey, useRemote)));
  };

  const handleApplyResolutions = () => {
    const resolvedConflicts = conflicts.map(conflict => {
      const conflictKey = `${conflict.itemId}-${conflict.field}`;
      const useRemote = resolutions.get(conflictKey) ?? false;
      
      return {
        itemId: conflict.itemId,
        field: conflict.field,
        useRemote
      };
    });

    onResolve(resolvedConflicts);
    onClose();
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Resolve Conflicts</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            These items were modified by both you and your teammate. Choose which version to keep:
          </p>

          {conflicts.map((conflict) => {
            const conflictKey = `${conflict.itemId}-${conflict.field}`;
            const selectedRemote = resolutions.get(conflictKey) ?? false;

            return (
              <div key={conflictKey} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Item: {conflict.itemId}</div>
                  <Badge variant="outline">Field: {conflict.field}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Local Version */}
                  <div 
                    className={`border rounded p-3 cursor-pointer transition-colors ${
                      !selectedRemote ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleResolutionChange(conflictKey, false)}
                  >
                    <div className="font-medium text-sm mb-2">Your Version</div>
                    <div className="text-sm mb-2 break-words">{conflict.localValue}</div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{conflict.localModifiedBy || 'You'}</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(conflict.localTimestamp), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Remote Version */}
                  <div 
                    className={`border rounded p-3 cursor-pointer transition-colors ${
                      selectedRemote ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleResolutionChange(conflictKey, true)}
                  >
                    <div className="font-medium text-sm mb-2">Teammate's Version</div>
                    <div className="text-sm mb-2 break-words">{conflict.remoteValue}</div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{conflict.remoteModifiedBy || 'Teammate'}</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(conflict.remoteTimestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApplyResolutions}>
            Apply Resolutions ({conflicts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictResolutionDialog;
