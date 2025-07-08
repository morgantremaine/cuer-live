import React from 'react';
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
import { AlertTriangle } from 'lucide-react';

interface DeleteColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  onConfirm: () => void;
}

const DeleteColumnDialog = ({
  open,
  onOpenChange,
  columnName,
  onConfirm
}: DeleteColumnDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle className="text-gray-900 dark:text-white">
              Delete Custom Column
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-gray-600 dark:text-gray-300">
            <div>
              Are you sure you want to delete the <strong className="text-gray-900 dark:text-white">"{columnName}"</strong> column?
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <div className="flex">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    This action will affect all team rundowns
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Deleting this column will remove it from all rundowns in your team that use it. 
                    Any data in this column will be permanently lost.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border-gray-300 dark:border-gray-500"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Column
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteColumnDialog;