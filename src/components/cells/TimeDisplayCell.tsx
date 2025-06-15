
import React from 'react';
import HighlightedText from '../HighlightedText';

interface TimeDisplayCellProps {
  value: string;
  backgroundColor?: string;
  textColor?: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
}

const TimeDisplayCell = ({ value, backgroundColor, textColor, highlight }: TimeDisplayCellProps) => {
  return (
    <div className="w-full h-full p-1" style={{ backgroundColor }}>
      <span 
        className="inline-block w-full text-sm font-mono px-2 py-1 rounded-sm text-center border-0"
        style={{ color: textColor || 'inherit' }}
      >
        {highlight ? (
          <HighlightedText text={value} highlight={highlight} />
        ) : (
          value || '00:00:00'
        )}
      </span>
    </div>
  );
};

export default TimeDisplayCell;
