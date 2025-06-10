
import React from 'react';
import HighlightedText from '../HighlightedText';

interface TimeDisplayCellProps {
  value: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
}

const TimeDisplayCell = ({ value, highlight }: TimeDisplayCellProps) => {
  return (
    <div className="w-full h-full min-h-[32px] p-1">
      <span className="inline-block w-full text-sm font-mono bg-gray-50 border border-gray-300 px-2 py-1 rounded-sm text-gray-900 min-h-[28px] text-center leading-6">
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
