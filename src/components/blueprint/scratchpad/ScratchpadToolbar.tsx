
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, Underline, Strikethrough } from 'lucide-react';

interface ScratchpadToolbarProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onBulletList: () => void;
}

const ScratchpadToolbar = ({
  isEditing,
  onToggleEdit,
  onBold,
  onItalic,
  onUnderline,
  onStrikethrough,
  onBulletList
}: ScratchpadToolbarProps) => {
  return (
    <div className="flex items-center gap-2">
      {isEditing && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onBold}
            className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onItalic}
            className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnderline}
            className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onStrikethrough}
            className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulletList}
            className="p-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button
        variant={isEditing ? "default" : "outline"}
        size="sm"
        onClick={onToggleEdit}
        className={isEditing ? "" : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"}
      >
        {isEditing ? 'Done' : 'Edit'}
      </Button>
    </div>
  );
};

export default ScratchpadToolbar;
