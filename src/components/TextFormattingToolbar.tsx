import React, { useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextFormattingToolbarProps {
  position: { x: number; y: number };
  onFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough', color?: string) => void;
  onColorSelect: (color: string) => void;
}

const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  position,
  onFormat,
  onColorSelect
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorOptions = [
    { name: 'Default', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' }
  ];

  const handleColorClick = (color: string) => {
    onColorSelect(color);
    setShowColorPicker(false);
  };

  return (
    <div
      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-1 flex items-center gap-1 z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%) translateY(-8px)'
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('bold')}
        className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('italic')}
        className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('underline')}
        className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat('strikethrough')}
        className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onMouseEnter={() => setShowColorPicker(true)}
          onMouseLeave={() => setShowColorPicker(false)}
          className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
          title="Text Color"
        >
          <Palette className="h-4 w-4" />
        </Button>
        
        {showColorPicker && (
          <div
            className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 z-[10000] min-w-[180px]"
            onMouseEnter={() => setShowColorPicker(true)}
            onMouseLeave={() => setShowColorPicker(false)}
          >
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleColorClick(color.value)}
                  className="flex flex-col items-center p-2 rounded hover:bg-gray-700 text-xs text-gray-300"
                >
                  <div
                    className="w-6 h-6 rounded border border-gray-500 mb-1"
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextFormattingToolbar;