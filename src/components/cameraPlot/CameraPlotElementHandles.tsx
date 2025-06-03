
import React from 'react';
import { CameraElement } from '@/hooks/useCameraPlot';

interface CameraPlotElementHandlesProps {
  element: CameraElement;
  isSelected: boolean;
}

const CameraPlotElementHandles = ({ element, isSelected }: CameraPlotElementHandlesProps) => {
  if (!isSelected) return null;

  // Check if element can be scaled (cameras and people cannot be scaled)
  const canScale = element.type !== 'camera' && element.type !== 'person';

  return (
    <>
      {/* Rotation handles (edges) */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-yellow-500 border border-white cursor-crosshair rounded-full" />
      
      {/* Scale handles (corners) - only for scalable elements */}
      {canScale && (
        <>
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-nw-resize" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-ne-resize" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border border-white cursor-sw-resize" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border border-white cursor-se-resize" />
        </>
      )}
    </>
  );
};

export default CameraPlotElementHandles;
