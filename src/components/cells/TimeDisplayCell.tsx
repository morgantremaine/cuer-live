
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
    <div className="flex items-center justify-start h-full min-h-[28px] w-full">
      <span className="text-sm font-mono bg-gray-100 dark:bg-gray-600 px-1 py-0.5 rounded text-gray-900 dark:text-gray-100">
        {highlight ? (
          <HighlightedText text={value} highlight={highlight} />
        ) : (
          value
        )}
      </span>
    </div>
  );
};

export default TimeDisplayCell;
