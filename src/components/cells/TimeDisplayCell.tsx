
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
    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-gray-900 dark:text-gray-100 inline-block min-w-[60px] text-center">
      {highlight ? (
        <HighlightedText text={value} highlight={highlight} />
      ) : (
        value || '00:00:00'
      )}
    </span>
  );
};

export default TimeDisplayCell;
