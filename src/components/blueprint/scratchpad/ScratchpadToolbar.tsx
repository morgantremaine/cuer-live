
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, List, CheckSquare } from 'lucide-react';

interface ScratchpadToolbarProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onFormat: (action: string) => void;
}

const ScratchpadToolbar = ({
  isEditing,
  onToggleEdit,
  onFormat
}: ScratchpadToolbarProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-gray-700">
      {isEditing && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('bold')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('italic')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('underline')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('strikethrough')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-600 mx-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('bullet')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFormat('checkbox')}
            className="text-gray-300 hover:text-white hover:bg-gray-600"
            title="Checkbox"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </>
      )}
      
      <div className="ml-auto">
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={onToggleEdit}
          className={!isEditing ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600" : ""}
        >
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>
    </div>
  );
};

export default ScratchpadToolbar;
