
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Tv, 
  Radio, 
  Mic, 
  Camera, 
  Music, 
  Video, 
  Calendar, 
  Clock, 
  Star, 
  Heart, 
  Bookmark, 
  Flag,
  FileText,
  Globe,
  Headphones,
  Play,
  Users,
  Zap,
  Trophy,
  Target
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'Tv', icon: Tv, label: 'TV' },
  { name: 'Radio', icon: Radio, label: 'Radio' },
  { name: 'Mic', icon: Mic, label: 'Microphone' },
  { name: 'Camera', icon: Camera, label: 'Camera' },
  { name: 'Music', icon: Music, label: 'Music' },
  { name: 'Video', icon: Video, label: 'Video' },
  { name: 'Calendar', icon: Calendar, label: 'Calendar' },
  { name: 'Clock', icon: Clock, label: 'Clock' },
  { name: 'Star', icon: Star, label: 'Star' },
  { name: 'Heart', icon: Heart, label: 'Heart' },
  { name: 'Bookmark', icon: Bookmark, label: 'Bookmark' },
  { name: 'Flag', icon: Flag, label: 'Flag' },
  { name: 'FileText', icon: FileText, label: 'Document' },
  { name: 'Globe', icon: Globe, label: 'Globe' },
  { name: 'Headphones', icon: Headphones, label: 'Headphones' },
  { name: 'Play', icon: Play, label: 'Play' },
  { name: 'Users', icon: Users, label: 'Users' },
  { name: 'Zap', icon: Zap, label: 'Lightning' },
  { name: 'Trophy', icon: Trophy, label: 'Trophy' },
  { name: 'Target', icon: Target, label: 'Target' }
];

interface IconPickerProps {
  selectedIcon?: string;
  onIconSelect: (iconName: string) => void;
}

const IconPicker = ({ selectedIcon, onIconSelect }: IconPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleIconSelect = (iconName: string) => {
    onIconSelect(iconName);
    setIsOpen(false);
  };

  const selectedIconData = AVAILABLE_ICONS.find(icon => icon.name === selectedIcon);
  const SelectedIconComponent = selectedIconData?.icon;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-700"
        >
          {SelectedIconComponent ? (
            <SelectedIconComponent className="h-4 w-4 text-gray-300" />
          ) : (
            <span className="text-xs text-gray-400">+</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-gray-800 border-gray-700">
        <div className="grid grid-cols-5 gap-2">
          {AVAILABLE_ICONS.map((iconData) => {
            const IconComponent = iconData.icon;
            return (
              <Button
                key={iconData.name}
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 hover:bg-gray-700 ${
                  selectedIcon === iconData.name 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : ''
                }`}
                onClick={() => handleIconSelect(iconData.name)}
                title={iconData.label}
              >
                <IconComponent className="h-4 w-4 text-gray-300" />
              </Button>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            onClick={() => handleIconSelect('')}
          >
            Remove Icon
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
