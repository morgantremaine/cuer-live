
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Rundown</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              Are you sure you want to permanently delete "<strong>{rundownTitle}</strong>"? 
              This action cannot be undone.
            </div>
            <div>
              <Label htmlFor="confirm-delete" className="text-sm font-medium">
                Type <strong>delete</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'delete' here"
                className="mt-2"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!isDeleteConfirmed}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
