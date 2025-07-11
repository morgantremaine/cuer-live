
import React from 'react';

interface CameraPlotGridProps {
  showGrid: boolean;
}

const CameraPlotGrid = ({ showGrid }: CameraPlotGridProps) => {
  if (!showGrid) return null;
  
  const gridSize = 40; // Larger grid for fewer lines
  const canvasWidth = 1200;
  const canvasHeight = 800;
  
  // Create grid using CSS pattern instead of individual SVG lines for better performance
  const patternId = 'camera-plot-grid';
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <pattern 
          id={patternId} 
          width={gridSize} 
          height={gridSize} 
          patternUnits="userSpaceOnUse"
        >
          <path 
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} 
            fill="none" 
            stroke="#374151" 
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>
      <rect 
        width={canvasWidth} 
        height={canvasHeight} 
        fill={`url(#${patternId})`}
      />
    </svg>
  );
};

export default CameraPlotGrid;
