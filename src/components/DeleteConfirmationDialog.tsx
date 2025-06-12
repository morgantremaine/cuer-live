
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
      <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Rundown</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-gray-300">
            <div>
              Are you sure you want to permanently delete "<strong className="text-white">{rundownTitle}</strong>"? 
              This action cannot be undone.
            </div>
            <div>
              <Label htmlFor="confirm-delete" className="text-sm font-medium text-gray-300">
                Type <strong className="text-white">delete</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'delete' here"
                className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!isDeleteConfirmed}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white"
          >
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
