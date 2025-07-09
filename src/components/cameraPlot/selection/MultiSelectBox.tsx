import React from 'react';

interface MultiSelectBoxProps {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  isVisible: boolean;
}

const MultiSelectBox: React.FC<MultiSelectBoxProps> = ({ startPos, endPos, isVisible }) => {
  if (!isVisible) return null;

  const left = Math.min(startPos.x, endPos.x);
  const top = Math.min(startPos.y, endPos.y);
  const width = Math.abs(endPos.x - startPos.x);
  const height = Math.abs(endPos.y - startPos.y);

  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500 bg-opacity-10 z-50"
      style={{
        left,
        top,
        width,
        height,
        borderStyle: 'dashed'
      }}
    />
  );
};

export default MultiSelectBox;