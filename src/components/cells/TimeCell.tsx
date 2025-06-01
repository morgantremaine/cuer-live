
import React from 'react';
import HighlightedText from '../HighlightedText';

interface TimeCellProps {
  value: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  width?: string;
}

const TimeCell = ({ value, highlight, width }: TimeCellProps) => {
  return (
    <td className="px-1 py-1 align-middle" style={{ width }}>
      <div className="flex items-center justify-start h-full min-h-[28px]">
        <span className="text-sm font-mono bg-gray-100 dark:bg-gray-600 px-1 py-0.5 rounded text-gray-900 dark:text-gray-100">
          <HighlightedText text={value} highlight={highlight} />
        </span>
      </div>
    </td>
  );
};

export default TimeCell;
