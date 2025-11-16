
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
  onCheckboxChange: (index: number, checked: boolean) => void;
}

const BlueprintListItem = ({ 
  item, 
  index, 
  isChecked,
  itemNumber,
  startTime, 
  onCheckboxChange 
}: BlueprintListItemProps) => {
  const { formatTime } = useClockFormat();
  
  return (
    <div className="p-2 bg-gray-700 rounded text-sm border border-gray-600 text-gray-200 flex items-center gap-2">
      <Checkbox
        checked={isChecked}
        onCheckedChange={(checked) => onCheckboxChange(index, checked as boolean)}
        className="flex-shrink-0"
      />
      <span className="flex-1 flex items-center gap-2">
        {itemNumber && (
          <span className="text-gray-400 text-xs font-mono">#{itemNumber}</span>
        )}
        <span>{item}</span>
      </span>
      {startTime && (
        <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0">
          <Clock className="h-3 w-3" />
          <span>{formatTime(startTime)}</span>
        </div>
      )}
    </div>
  );
};

export default BlueprintListItem;
