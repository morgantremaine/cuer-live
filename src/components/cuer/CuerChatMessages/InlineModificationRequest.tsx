
import React from 'react';
import { CheckCircle, XCircle, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RundownModification } from '@/hooks/useCuerModifications/types';

interface InlineModificationRequestProps {
  modifications: RundownModification[];
  onConfirm: () => void;
  onCancel: () => void;
}

const getModificationIcon = (type: string) => {
  switch (type) {
    case 'add':
      return <Plus className="w-3 h-3 text-green-600" />;
    case 'update':
      return <Edit3 className="w-3 h-3 text-blue-600" />;
    case 'delete':
      return <Trash2 className="w-3 h-3 text-red-600" />;
    default:
      return <Edit3 className="w-3 h-3 text-gray-600" />;
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

const InlineModificationRequest = ({
  modifications,
  onConfirm,
  onCancel
}: InlineModificationRequestProps) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
      <div className="flex items-center space-x-2 mb-3">
        <CheckCircle className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          I want to modify your rundown
        </span>
      </div>
      
      <div className="space-y-2 mb-3">
        {modifications.map((mod, index) => (
          <div
            key={index}
            className={`border-l-2 p-2 rounded-r text-xs ${getModificationColor(mod.type)}`}
          >
            <div className="flex items-start space-x-2">
              {getModificationIcon(mod.type)}
              <div className="flex-1">
                <div className="font-medium capitalize mb-1">
                  {mod.type} Operation
                </div>
                <div className="text-gray-700">
                  {mod.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          className="text-xs"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Decline
        </Button>
        <Button 
          size="sm" 
          onClick={onConfirm}
          className="text-xs"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Apply ({modifications.length})
        </Button>
      </div>
    </div>
  );
};

export default InlineModificationRequest;
