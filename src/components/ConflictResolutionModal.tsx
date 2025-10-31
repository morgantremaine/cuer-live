import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FieldConflict } from '@/utils/threeWayMerge';
import { AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictResolutionModalProps {
  open: boolean;
  conflicts: FieldConflict[];
  onResolve: (resolutions: Map<string, 'ours' | 'theirs'>) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal = ({
  open,
  conflicts,
  onResolve,
  onCancel
}: ConflictResolutionModalProps) => {
  const [resolutions, setResolutions] = useState<Map<string, 'ours' | 'theirs'>>(new Map());

  const handleResolutionChange = (conflictKey: string, value: 'ours' | 'theirs') => {
    setResolutions(prev => new Map(prev).set(conflictKey, value));
  };

  const handleResolve = () => {
    // Auto-select "ours" for any unresolved conflicts
    const finalResolutions = new Map(resolutions);
    conflicts.forEach((conflict) => {
      const key = conflict.itemId ? `${conflict.itemId}-${conflict.field}` : conflict.field;
      if (!finalResolutions.has(key)) {
        finalResolutions.set(key, 'ours');
      }
    });
    onResolve(finalResolutions);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Resolve Sync Conflicts
          </DialogTitle>
          <DialogDescription>
            Changes were made by another user while you were offline. Choose which version to keep for each conflict.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {conflicts.map((conflict, index) => {
              const key = conflict.itemId ? `${conflict.itemId}-${conflict.field}` : conflict.field;
              const currentResolution = resolutions.get(key);

              return (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium text-sm text-foreground">
                    {conflict.field}
                  </div>

                  <RadioGroup
                    value={currentResolution}
                    onValueChange={(value) => handleResolutionChange(key, value as 'ours' | 'theirs')}
                  >
                    {/* Your version */}
                    <div className="flex items-start space-x-3 space-y-0 border rounded-md p-3 hover:bg-accent/50">
                      <RadioGroupItem value="ours" id={`${key}-ours`} />
                      <div className="flex-1">
                        <Label htmlFor={`${key}-ours`} className="font-medium cursor-pointer">
                          Your version (offline changes)
                        </Label>
                        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(conflict.timestamp.ours, { addSuffix: true })}
                        </div>
                        <div className="mt-2 text-sm bg-background p-2 rounded border">
                          {formatValue(conflict.ours)}
                        </div>
                      </div>
                    </div>

                    {/* Their version */}
                    <div className="flex items-start space-x-3 space-y-0 border rounded-md p-3 hover:bg-accent/50">
                      <RadioGroupItem value="theirs" id={`${key}-theirs`} />
                      <div className="flex-1">
                        <Label htmlFor={`${key}-theirs`} className="font-medium cursor-pointer">
                          Other user's version (current)
                        </Label>
                        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Just now
                        </div>
                        <div className="mt-2 text-sm bg-background p-2 rounded border">
                          {formatValue(conflict.theirs)}
                        </div>
                      </div>
                    </div>
                  </RadioGroup>

                  {conflict.base !== undefined && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <span className="font-medium">Original value:</span> {formatValue(conflict.base)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel Sync
          </Button>
          <Button onClick={handleResolve}>
            Apply Resolutions ({conflicts.length} conflicts)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
