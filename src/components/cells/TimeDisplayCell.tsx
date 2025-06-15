
import React from 'react';
import HighlightedText from '../HighlightedText';

interface TimeDisplayCellProps {
  value: string;
  textColor?: string;
  backgroundColor?: string;
  width: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
}

const TimeDisplayCell = ({ value, textColor, backgroundColor, width, highlight }: TimeDisplayCellProps) => {
  return (
    <div className="px-2 py-1" style={{ width, backgroundColor }}>
      <span 
        className="inline-block w-full text-sm font-mono px-2 py-1 rounded-sm text-center border-0"
        style={{ color: textColor }}
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
