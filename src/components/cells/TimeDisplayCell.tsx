import React from 'react';
import { useClockFormat } from '@/contexts/ClockFormatContext';

interface TimeDisplayCellProps {
  value: string;
  backgroundColor?: string;
  textColor?: string;
}

const TimeDisplayCell = ({ value, backgroundColor, textColor }: TimeDisplayCellProps) => {
  const { formatTime } = useClockFormat();
  
  return (
    <div className="w-full h-full p-1" style={{ backgroundColor }}>
      <span 
        className="inline-block w-full text-sm font-mono px-1 py-1 rounded-sm text-center border-0"
        style={{ color: textColor || 'inherit' }}
      >
        {formatTime(value || '00:00:00')}
      </span>
    </div>
  );
};

export default TimeDisplayCell;