
import React from 'react';

interface TimeDisplayCellProps {
  value: string;
  onChange?: (value: string) => void;
  onUserTyping?: (typing: boolean) => void;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

const TimeDisplayCell = ({ 
  value, 
  onChange, 
  onUserTyping, 
  backgroundColor, 
  textColor, 
  className = '' 
}: TimeDisplayCellProps) => {
  return (
    <div className={`w-full h-full p-1 ${className}`} style={{ backgroundColor }}>
      <span 
        className="inline-block w-full text-sm font-mono px-1 py-1 rounded-sm text-center border-0"
        style={{ color: textColor || 'inherit' }}
      >
        {value || '00:00:00'}
      </span>
    </div>
  );
};

export default TimeDisplayCell;
