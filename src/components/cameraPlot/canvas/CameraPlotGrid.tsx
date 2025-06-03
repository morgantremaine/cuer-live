
import React from 'react';

interface CameraPlotGridProps {
  showGrid: boolean;
}

const CameraPlotGrid = ({ showGrid }: CameraPlotGridProps) => {
  if (!showGrid) return null;
  
  const gridSize = 20;
  const lines = [];
  
  for (let x = 0; x <= 2000; x += gridSize) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={2000}
        stroke="#374151"
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }
  
  for (let y = 0; y <= 2000; y += gridSize) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={2000}
        y2={y}
        stroke="#374151"
        strokeWidth={0.5}
        opacity={0.3}
      />
    );
  }
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {lines}
    </svg>
  );
};

export default CameraPlotGrid;
