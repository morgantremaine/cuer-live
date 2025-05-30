import React from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  itemId: string;
  showColorPicker: string | null;
  onToggle: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
}

const ColorPicker = ({ itemId, showColorPicker, onToggle, onColorSelect }: ColorPickerProps) => {
  const colorOptions = [
    { name: 'Default', value: '' },
    { name: 'Red', value: '#fca5a5' },
    { name: 'Orange', value: '#fdba74' },
    { name: 'Yellow', value: '#fde047' },
    { name: 'Green', value: '#86efac' },
    { name: 'Blue', value: '#93c5fd' },
    { name: 'Purple', value: '#c4b5fd' },
    { name: 'Pink', value: '#f9a8d4' },
    { name: 'Gray', value: '#d1d5db' }
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle(itemId)}
        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        <Palette className="h-4 w-4" />
      </Button>
      
      {showColorPicker === itemId && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-48">
          <div className="grid grid-cols-3 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.name}
                onClick={() => onColorSelect(itemId, color.value)}
                className="flex flex-col items-center p-2 rounded hover:bg-gray-100 text-xs"
              >
                <div 
                  className="w-6 h-6 rounded border border-gray-300 mb-1"
                  style={{ backgroundColor: color.value || '#ffffff' }}
                />
                {color.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
