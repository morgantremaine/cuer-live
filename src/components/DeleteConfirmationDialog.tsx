
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rundownTitle: string;
  onConfirm: () => void;
}

const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  rundownTitle,
  onConfirm
}: DeleteConfirmationDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const isDeleteConfirmed = confirmText.toLowerCase() === 'delete';

  const handleConfirm = () => {
    if (isDeleteConfirmed) {
      onConfirm();
      setConfirmText('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background border border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Delete Rundown</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-muted-foreground">
            <div>
              Are you sure you want to permanently delete "<strong className="text-foreground">{rundownTitle}</strong>"? 
              This action cannot be undone.
            </div>
            <div>
              <Label htmlFor="confirm-delete" className="text-sm font-medium text-foreground">
                Type <strong>delete</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'delete' here"
                className="mt-2 bg-background border-input text-foreground"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            className="bg-background text-foreground border-border hover:bg-accent"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!isDeleteConfirmed}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
