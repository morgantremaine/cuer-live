
import React from 'react';
import { CheckCircle, XCircle, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RundownModification } from '@/services/openaiService';

interface RundownModificationDialogProps {
  isOpen: boolean;
  modifications: RundownModification[];
  onConfirm: () => void;
  onCancel: () => void;
}

const getModificationIcon = (type: string) => {
  switch (type) {
    case 'add':
      return <Plus className="w-4 h-4 text-green-600" />;
    case 'update':
      return <Edit3 className="w-4 h-4 text-blue-600" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-600" />;
    default:
      return <Edit3 className="w-4 h-4 text-gray-600" />;
  }
};

const getModificationColor = (type: string) => {
  switch (type) {
    case 'add':
      return 'border-l-green-500 bg-green-50';
    case 'update':
      return 'border-l-blue-500 bg-blue-50';
    case 'delete':
      return 'border-l-red-500 bg-red-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

const RundownModificationDialog = ({
  isOpen,
  modifications,
  onConfirm,
  onCancel
}: RundownModificationDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span>Cuer wants to modify your rundown</span>
          </DialogTitle>
          <DialogDescription>
            Review the proposed changes below. You can approve or decline these modifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {modifications.map((mod, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-r-lg ${getModificationColor(mod.type)}`}
            >
              <div className="flex items-start space-x-3">
                {getModificationIcon(mod.type)}
                <div className="flex-1">
                  <div className="font-medium text-sm capitalize mb-1">
                    {mod.type} Operation
                  </div>
                  <div className="text-sm text-gray-700">
                    {mod.description}
                  </div>
                  {mod.data && (
                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(mod.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <XCircle className="w-4 h-4 mr-2" />
            Decline Changes
          </Button>
          <Button onClick={onConfirm}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Apply Changes ({modifications.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RundownModificationDialog;
