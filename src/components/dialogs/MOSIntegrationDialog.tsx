import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MOSIntegrationSettings from '@/components/settings/MOSIntegrationSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MOSIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export const MOSIntegrationDialog: React.FC<MOSIntegrationDialogProps> = ({
  open,
  onOpenChange,
  teamId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>MOS Integration Setup</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <MOSIntegrationSettings teamId={teamId} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
