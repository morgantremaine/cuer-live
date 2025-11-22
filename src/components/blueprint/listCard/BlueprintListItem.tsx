
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock } from 'lucide-react';
import { useClockFormat } from '@/contexts/ClockFormatContext';

interface BlueprintListItemProps {
  item: string;
  index: number;
  isChecked: boolean;
  itemNumber?: string | null;
  startTime?: string | null;
  itemColor?: string | null;
  onCheckboxChange: (index: number, checked: boolean) => void;
}

const BlueprintListItem = ({ 
  item, 
  index, 
  isChecked,
  itemNumber,
  startTime,
  itemColor,
  onCheckboxChange 
}: BlueprintListItemProps) => {
  const { formatTime } = useClockFormat();
  
  // Determine if text should be light or dark based on background color
  const getTextColor = (bgColor: string | null) => {
    if (!bgColor) return 'text-gray-200';
    
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text for dark backgrounds, dark text for light backgrounds
    return luminance > 0.5 ? 'text-gray-900' : 'text-white';
  };

  const textColorClass = getTextColor(itemColor);
  
  return (
    <div 
      className={`p-2 rounded text-sm border flex items-center gap-2 ${
        itemColor 
          ? 'border-gray-600' 
          : 'bg-gray-700 border-gray-600 text-gray-200'
      } ${itemColor ? textColorClass : ''}`}
      style={itemColor ? { backgroundColor: itemColor } : undefined}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={(checked) => onCheckboxChange(index, checked as boolean)}
        className="flex-shrink-0"
      />
      <span className="flex-1 flex items-center gap-2">
        {itemNumber && (
          <span className={`text-xs font-mono ${itemColor ? 'opacity-70' : 'text-gray-400'}`}>
            #{itemNumber}
          </span>
        )}
        <span>{item}</span>
      </span>
      {startTime && (
        <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${itemColor ? 'opacity-70' : 'text-gray-400'}`}>
          <Clock className="h-3 w-3" />
          <span>{formatTime(startTime)}</span>
        </div>
      )}
    </div>
  );
};

export default BlueprintListItem;
