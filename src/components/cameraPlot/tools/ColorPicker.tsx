import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#D2B48C', '#BC8F8F', '#F5DEB3',
  '#696969', '#A9A9A9', '#C0C0C0', '#DCDCDC', '#F5F5F5', '#FFFAFA', '#F0F0F0', '#E6E6FA',
  '#4169E1', '#6495ED', '#87CEEB', '#87CEFA', '#00BFFF', '#1E90FF', '#4682B4', '#5F9EA0',
  '#228B22', '#32CD32', '#90EE90', '#98FB98', '#00FF7F', '#00FA9A', '#7CFC00', '#ADFF2F',
  '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500', '#FF1493', '#FFB6C1', '#FFC0CB'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, disabled = false }) => {
  const [customColor, setCustomColor] = useState(color);
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (newColor: string) => {
    onChange(newColor);
    setCustomColor(newColor);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
        >
          <Palette className="h-4 w-4" />
          <div 
            className="w-4 h-4 rounded border border-gray-400"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs">Color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-gray-800 border-gray-700">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Preset Colors</label>
            <div className="grid grid-cols-8 gap-1">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`w-6 h-6 rounded border-2 ${
                    color === presetColor ? 'border-blue-500' : 'border-gray-600'
                  } hover:border-gray-400 transition-colors`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorChange(presetColor)}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Custom Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-12 h-8 p-0 border-0 bg-transparent cursor-pointer"
              />
              <Input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                placeholder="#000000"
                className="flex-1 bg-gray-700 border-gray-600 text-white text-sm"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;