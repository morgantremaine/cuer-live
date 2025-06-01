
import React from 'react';
import HighlightedText from '../HighlightedText';

interface TimeCellProps {
  columnId: string;
  value: string;
  width?: string;
  highlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  onCellClick: (e: React.MouseEvent) => void;
}

const TimeCell = ({ columnId, value, width, highlight, onCellClick }: TimeCellProps) => {
  return (
    <td key={columnId} className="px-4 py-2" onClick={onCellClick} style={{ width }}>
      <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
        <HighlightedText text={value} highlight={highlight} />
      </span>
    </td>
  );
};

export default TimeCell;
