import React, { useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormatStates } from './RichTextCell';

interface InlineFormattingToolbarProps {
  isVisible: boolean;
  position: { top: number; left: number };
  formatStates: FormatStates;
  onFormat: (action: string, value?: string) => void;
}

const InlineFormattingToolbar: React.FC<InlineFormattingToolbarProps> = ({
  isVisible,
  position,
  formatStates,
  onFormat
}) => {
  const [selectedColor, setSelectedColor] = useState('#000000');

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' }
  ];

  if (!isVisible) return null;

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onFormat('foreColor', color);
  };

  return (
    <div
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-1 flex items-center gap-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%) translateY(-8px)'
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${formatStates.bold ? 'bg-accent' : ''}`}
        onClick={() => onFormat('bold')}
        title="Bold (⌘B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${formatStates.italic ? 'bg-accent' : ''}`}
        onClick={() => onFormat('italic')}
        title="Italic (⌘I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${formatStates.underline ? 'bg-accent' : ''}`}
        onClick={() => onFormat('underline')}
        title="Underline (⌘U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 ${formatStates.strikethrough ? 'bg-accent' : ''}`}
        onClick={() => onFormat('strikeThrough')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Text Color"
          >
            <div className="relative">
              <Palette className="h-4 w-4" />
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default InlineFormattingToolbar;
