
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, List, CheckSquare } from 'lucide-react';

interface ScratchpadStreamlinedToolbarProps {
  onFormat: (action: string) => void;
}

const ScratchpadStreamlinedToolbar = ({
  onFormat
}: ScratchpadStreamlinedToolbarProps) => {
  return (
    <div className="flex items-center gap-1 p-3 border-b border-gray-700 bg-gray-800">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bold')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Bold (⌘B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('italic')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Italic (⌘I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('underline')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Underline (⌘U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('strikethrough')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-600 mx-2" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bullet')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('checkbox')}
        className="text-gray-300 hover:text-white hover:bg-gray-600 h-8 w-8 p-0"
        title="Checkbox"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ScratchpadStreamlinedToolbar;
