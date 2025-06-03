
import React from 'react';

interface CameraPlotEmptyStateProps {
  hasElements: boolean;
  isDrawingWall: boolean;
}

const CameraPlotEmptyState = ({ hasElements, isDrawingWall }: CameraPlotEmptyStateProps) => {
  if (hasElements) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-300 text-center pointer-events-none">
      <p className="text-lg mb-2">Camera Plot Canvas</p>
      <p className="text-sm">Select a tool and click to add elements</p>
      {isDrawingWall && (
        <p className="text-xs mt-2 text-blue-400">
          Click to add wall points, double-click to finish
        </p>
      )}
    </div>
  );
};

export default CameraPlotEmptyState;
