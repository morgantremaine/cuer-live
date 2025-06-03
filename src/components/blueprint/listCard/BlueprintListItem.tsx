
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock } from 'lucide-react';

interface BlueprintListItemProps {
  item: string;
  index: number;
  isChecked: boolean;
  startTime?: string | null;
  onCheckboxChange: (index: number, checked: boolean) => void;
}

const BlueprintListItem = ({ 
  item, 
  index, 
  isChecked, 
  startTime, 
  onCheckboxChange 
}: BlueprintListItemProps) => {
  return (
    <div className="p-2 bg-gray-700 rounded text-sm border border-gray-600 text-gray-200 flex items-center gap-2">
      <Checkbox
        checked={isChecked}
        onCheckedChange={(checked) => onCheckboxChange(index, checked as boolean)}
        className="flex-shrink-0"
      />
      <span className="flex-1">{item}</span>
      {startTime && (
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="h-3 w-3" />
          <span>{startTime}</span>
        </div>
      )}
    </div>
  );
};

export default BlueprintListItem;
