
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, List, CheckSquare } from 'lucide-react';

interface FormatStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

interface ScratchpadStreamlinedToolbarProps {
  onFormat: (action: string) => void;
  formatStates?: FormatStates;
}

const ScratchpadStreamlinedToolbar = ({
  onFormat,
  formatStates = { bold: false, italic: false, underline: false, strikethrough: false }
}: ScratchpadStreamlinedToolbarProps) => {
  return (
    <div className="flex items-center gap-1 p-3 border-b border-gray-700 bg-gray-800">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bold')}
        className={`h-8 w-8 p-0 ${
          formatStates.bold 
            ? 'text-white bg-gray-600' 
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        }`}
        title="Bold (⌘B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('italic')}
        className={`h-8 w-8 p-0 ${
          formatStates.italic 
            ? 'text-white bg-gray-600' 
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        }`}
        title="Italic (⌘I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('underline')}
        className={`h-8 w-8 p-0 ${
          formatStates.underline 
            ? 'text-white bg-gray-600' 
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        }`}
        title="Underline (⌘U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('strikethrough')}
        className={`h-8 w-8 p-0 ${
          formatStates.strikethrough 
            ? 'text-white bg-gray-600' 
            : 'text-gray-300 hover:text-white hover:bg-gray-600'
        }`}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-600 mx-2" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bulletList')}
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
